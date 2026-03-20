import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const backfillReportTemplatesCommand = new Command('report-templates')

// ------------------------------------------------------------------
// 1. Last 3 Workouts Analysis
// ------------------------------------------------------------------

const last3WorkoutsSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description: 'Type of analysis: workout, weekly_report, planning, comparison',
      enum: ['workout', 'weekly_report', 'planning', 'comparison']
    },
    title: {
      type: 'string',
      description: 'Title of the analysis'
    },
    date: {
      type: 'string',
      description: 'Date or date range of the analysis'
    },
    executive_summary: {
      type: 'string',
      description: '2-3 sentence high-level summary of key findings'
    },
    sections: {
      type: 'array',
      description: 'Analysis sections with status and points',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Section title (e.g., Training Progression, Recovery Patterns)'
          },
          status: {
            type: 'string',
            description: 'Overall assessment',
            enum: ['excellent', 'good', 'moderate', 'needs_improvement', 'poor']
          },
          status_label: {
            type: 'string',
            description: 'Display label for status'
          },
          analysis_points: {
            type: 'array',
            description:
              'Detailed analysis points for this section. Each point should be 1-2 sentences maximum as a separate array item. Do NOT combine multiple points into paragraph blocks.',
            items: {
              type: 'string'
            }
          }
        },
        required: ['title', 'status', 'status_label', 'analysis_points']
      }
    },
    recommendations: {
      type: 'array',
      description: 'Actionable coaching recommendations',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Recommendation title'
          },
          priority: {
            type: 'string',
            description: 'Priority level',
            enum: ['high', 'medium', 'low']
          },
          description: {
            type: 'string',
            description: 'Detailed recommendation'
          }
        },
        required: ['title', 'priority', 'description']
      }
    },
    metrics_summary: {
      type: 'object',
      description: 'Key metrics across the workouts',
      properties: {
        total_duration_minutes: { type: 'number' },
        total_tss: { type: 'number' },
        avg_power: { type: 'number' },
        avg_heart_rate: { type: 'number' },
        total_distance_km: { type: 'number' }
      }
    }
  },
  required: ['type', 'title', 'executive_summary', 'sections']
}

const last3WorkoutsPrompt = `You are a friendly, supportive cycling coach analyzing your athlete's recent training progression.

USER PROFILE:
- FTP: {{user.ftp}} watts
- Weight: {{user.weight}} kg
- Max HR: {{user.maxHr}} bpm
- W/kg: {{user.wKg}}
- Preferred Language: {{user.language}} (CRITICAL: ALL analysis, summaries, and text responses MUST be written in this language)

{{sport_settings_context}}

RECENT WORKOUTS (Last 3 Cycling Sessions):
{{workouts_summary}}

ANALYSIS FOCUS:
1. **Training Progression**: Are they building fitness effectively? Getting stronger or showing fatigue?
2. **Power Consistency**: How does power output compare across workouts? Improving or declining?
3. **Recovery Patterns**: What does RPE, feel, and HR tell us about recovery between sessions?
4. **Intensity Distribution**: Are they balancing hard efforts with recovery appropriately?
5. **Performance Trends**: Any positive adaptations or warning signs of overreaching?

IMPORTANT FORMATTING RULES:
- Keep each analysis_point to 1-2 sentences maximum as a separate array item
- Do NOT combine multiple insights into one paragraph block
- Each point should be concise and specific
- Use a friendly, conversational coaching tone
- Be encouraging and supportive while providing honest feedback

OUTPUT: Generate a structured JSON analysis with:
- Type: "comparison"
- Title describing the analysis period
- Executive summary (2-3 sentences with key insights)
- Sections analyzing different aspects (4-6 sections)
- Specific, actionable recommendations (3-5 items)
- Metrics summary with aggregate data

Be specific with numbers and trends. Highlight both strengths and areas for improvement.`

// ------------------------------------------------------------------
// 2. Weekly Analysis
// ------------------------------------------------------------------

const weeklyAnalysisSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description: 'Type of analysis: workout, weekly_report, planning, comparison',
      enum: ['workout', 'weekly_report', 'planning', 'comparison']
    },
    title: {
      type: 'string',
      description: 'Title of the analysis'
    },
    date: {
      type: 'string',
      description: 'Date or date range of the analysis'
    },
    executive_summary: {
      type: 'string',
      description: '2-3 sentence high-level summary of key findings'
    },
    sections: {
      type: 'array',
      description: 'Analysis sections with status and points',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Section title (e.g., Training Load Analysis, Recovery Trends)'
          },
          status: {
            type: 'string',
            description: 'Overall assessment',
            enum: ['excellent', 'good', 'moderate', 'needs_improvement', 'poor']
          },
          status_label: {
            type: 'string',
            description: 'Display label for status'
          },
          analysis_points: {
            type: 'array',
            description:
              'Detailed analysis points for this section. Each point should be 1-2 sentences maximum as a separate array item. Do NOT combine multiple points into paragraph blocks.',
            items: {
              type: 'string'
            }
          }
        },
        required: ['title', 'status', 'status_label', 'analysis_points']
      }
    },
    recommendations: {
      type: 'array',
      description: 'Actionable coaching recommendations',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Recommendation title'
          },
          priority: {
            type: 'string',
            description: 'Priority level',
            enum: ['high', 'medium', 'low']
          },
          description: {
            type: 'string',
            description: 'Detailed recommendation'
          }
        },
        required: ['title', 'priority', 'description']
      }
    },
    scores: {
      type: 'object',
      description:
        'Period performance scores on 1-10 scale for tracking over time, with detailed explanations',
      properties: {
        overall: { type: 'number', minimum: 1, maximum: 10 },
        overall_explanation: { type: 'string' },
        training_load: { type: 'number', minimum: 1, maximum: 10 },
        training_load_explanation: { type: 'string' },
        recovery: { type: 'number', minimum: 1, maximum: 10 },
        recovery_explanation: { type: 'string' },
        progress: { type: 'number', minimum: 1, maximum: 10 },
        progress_explanation: { type: 'string' },
        consistency: { type: 'number', minimum: 1, maximum: 10 },
        consistency_explanation: { type: 'string' }
      },
      required: [
        'overall',
        'overall_explanation',
        'training_load',
        'training_load_explanation',
        'recovery',
        'recovery_explanation',
        'progress',
        'progress_explanation',
        'consistency',
        'consistency_explanation'
      ]
    },
    metrics_summary: {
      type: 'object',
      description: 'Key metrics across the period',
      properties: {
        total_duration_minutes: { type: 'number' },
        total_tss: { type: 'number' },
        avg_power: { type: 'number' },
        avg_heart_rate: { type: 'number' },
        total_distance_km: { type: 'number' }
      }
    }
  },
  required: ['type', 'title', 'executive_summary', 'sections', 'scores']
}

const weeklyAnalysisPrompt = `You are a **{{persona}}** expert cycling coach analyzing the previous week of training data (last 7 days).
Adapt your analysis tone and style to match your persona.
Preferred Language: {{user.language}} (CRITICAL: ALL analysis, summaries, and text responses MUST be written in this language)

USER PROFILE:
- FTP: {{user.ftp}} watts
- Weight: {{user.weight}} kg
- Max HR: {{user.maxHr}} bpm
- W/kg: {{user.wKg}}

WORKOUTS (Last 7 days):
{{workouts_summary}}

DAILY METRICS (Recovery & Sleep):
{{metrics_summary}}
{{activeGoals_context}}

ANALYSIS INSTRUCTIONS:
Create a comprehensive weekly training analysis with these sections:

1. **Training Load Analysis**: Analyze TSS distribution, intensity balance (easy/moderate/hard), and training load trends
2. **Recovery Trends**: Evaluate HRV patterns, sleep quality, and recovery adequacy relative to training stress
3. **Power Progression**: Assess improvements or regressions in power metrics and performance indicators
4. **Fatigue & Form**: Analyze training stress balance (CTL/ATL), freshness, and readiness

For each section:
- Provide a status assessment (excellent/good/moderate/needs_improvement/poor)
- List 3-5 specific, data-driven analysis points (each as a separate bullet, 1-2 sentences max)
- Reference actual numbers and metrics from the data
- Consider progress toward active goals where relevant

Then provide 3-5 prioritized recommendations with specific actions (including goal-related recommendations if applicable).

Finally, provide **Performance Scores** (1-10 scale for tracking progress over time):
- **Overall**: Holistic assessment of the training period quality
- **Training Load**: How well was training load managed and distributed?
- **Recovery**: Were recovery and adaptation adequate for the training stress?
- **Progress**: Evidence of improvement and positive adaptation
- **Consistency**: Training consistency and adherence to plan

Scoring Guidelines:
- 9-10: Exceptional period, elite-level execution
- 7-8: Strong period with minor areas to improve
- 5-6: Adequate but room for improvement
- 3-4: Needs work, several issues to address
- 1-2: Poor period, significant problems

Maintain your **{{persona}}** persona throughout. Be specific with numbers. Scores should realistically reflect the period's quality.`

// ------------------------------------------------------------------
// 3. Nutrition Analysis
// ------------------------------------------------------------------

const nutritionAnalysisSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description: 'Type of analysis: nutrition_analysis',
      enum: ['nutrition_analysis']
    },
    title: {
      type: 'string',
      description: 'Title of the analysis'
    },
    date: {
      type: 'string',
      description: 'Date or date range of the analysis'
    },
    executive_summary: {
      type: 'string',
      description: '2-3 sentence high-level summary of nutritional patterns and key findings'
    },
    sections: {
      type: 'array',
      description: 'Nutrition analysis sections with status and points',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description:
              'Section title (e.g., Caloric Balance, Macronutrient Distribution, Weekly Patterns)'
          },
          status: {
            type: 'string',
            description: 'Overall assessment',
            enum: ['excellent', 'good', 'moderate', 'needs_improvement', 'poor']
          },
          status_label: {
            type: 'string',
            description: 'Display label for status'
          },
          analysis_points: {
            type: 'array',
            description:
              'Detailed analysis points for this section. Each point should be 1-2 sentences maximum as a separate array item.',
            items: {
              type: 'string'
            }
          }
        },
        required: ['title', 'status', 'status_label', 'analysis_points']
      }
    },
    recommendations: {
      type: 'array',
      description: 'Actionable nutrition recommendations',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Recommendation title'
          },
          priority: {
            type: 'string',
            description: 'Priority level',
            enum: ['high', 'medium', 'low']
          },
          description: {
            type: 'string',
            description: 'Detailed recommendation'
          }
        },
        required: ['title', 'priority', 'description']
      }
    },
    nutrition_summary: {
      type: 'object',
      description: 'Key nutrition metrics across the period',
      properties: {
        avg_calories: { type: 'number' },
        avg_protein: { type: 'number' },
        avg_carbs: { type: 'number' },
        avg_fat: { type: 'number' },
        avg_fiber: { type: 'number' },
        calories_vs_goal_pct: { type: 'number' },
        protein_vs_goal_pct: { type: 'number' },
        consistency_score: { type: 'number' }
      }
    }
  },
  required: ['type', 'title', 'executive_summary', 'sections']
}

const nutritionAnalysisPrompt = `You are a friendly, supportive nutrition coach analyzing your athlete's dietary intake.

USER PROFILE:
- FTP: {{user.ftp}} watts
- Weight: {{user.weight}} kg
- Cycling athlete - endurance training focus
- Preferred Language: {{user.language}} (CRITICAL: ALL analysis, summaries, and text responses MUST be written in this language)

NUTRITION DATA (Last {{days}} Days):
{{nutrition_summary}}

ANALYSIS FOCUS:
1. **Caloric Balance**: Overall energy intake trends - consistency and adequacy
2. **Macronutrient Distribution**: Is the protein/carbs/fat balance appropriate and consistent for an endurance athlete?
3. **Protein Consistency**: Daily protein intake patterns - meeting recovery needs consistently?
4. **Carbohydrate Patterns**: Fueling patterns - matching training demands?
5. **Trends**: Day-to-day variability, areas of consistency or inconsistency
6. **Hydration Habits**: Water intake patterns
7. **Goal Achievement**: How well are nutrition goals being met?

IMPORTANT FORMATTING RULES:
- Keep each analysis_point to 1-2 sentences maximum as a separate array item
- Do NOT combine multiple insights into one paragraph block
- Each point should be concise and specific
- Use a friendly, supportive coaching tone
- Be encouraging while providing honest feedback
- Reference specific numbers, trends, and patterns from the data

OUTPUT: Generate a structured JSON analysis with:
- Type: "nutrition_analysis"
- Title describing the analysis period
- Executive summary (2-3 sentences with key nutritional insights)
- Sections analyzing different aspects (5-7 sections)
- Specific, actionable recommendations (3-5 items)
- Nutrition summary with aggregate data and consistency metrics

Be specific with numbers and trends. Highlight patterns, consistency, and opportunities for improvement.`

backfillReportTemplatesCommand
  .description('Initialize system report templates in the database')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    if (isProd) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    console.log(chalk.blue('Seeding report templates...'))

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      // Upsert Last 3 Workouts
      await prisma.reportTemplate.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        create: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Last 3 Workouts Analysis',
          description:
            'Analyze your 3 most recent endurance workouts to identify trends, progression, and recovery patterns.',
          icon: 'i-heroicons-chart-bar',
          isSystem: true,
          inputConfig: {
            sources: [
              {
                entity: 'workout',
                key: 'workouts',
                filter: { type: ['Ride', 'VirtualRide', 'Cycling'] },
                limit: 3,
                orderBy: { date: 'desc' }
              },
              {
                entity: 'sport_settings',
                key: 'sportSettings',
                activityType: 'Ride'
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: last3WorkoutsPrompt,
            schema: last3WorkoutsSchema
          } as any
        },
        update: {
          name: 'Last 3 Workouts Analysis',
          description:
            'Analyze your 3 most recent endurance workouts to identify trends, progression, and recovery patterns.',
          icon: 'i-heroicons-chart-bar',
          inputConfig: {
            sources: [
              {
                entity: 'workout',
                key: 'workouts',
                filter: { type: ['Ride', 'VirtualRide', 'Cycling'] },
                limit: 3,
                orderBy: { date: 'desc' }
              },
              {
                entity: 'sport_settings',
                key: 'sportSettings',
                activityType: 'Ride'
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: last3WorkoutsPrompt,
            schema: last3WorkoutsSchema
          } as any
        }
      })

      // Upsert Weekly Analysis
      await prisma.reportTemplate.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        create: {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Weekly Training Analysis',
          description:
            'Comprehensive analysis of the last 7 days of training including workouts, recovery metrics, and recommendations.',
          icon: 'i-heroicons-calendar',
          isSystem: true,
          inputConfig: {
            sources: [
              {
                entity: 'workout',
                key: 'workouts',
                range: { type: 'days', value: 7 }
              },
              {
                entity: 'wellness',
                key: 'metrics',
                range: { type: 'days', value: 7 }
              },
              {
                entity: 'goal',
                key: 'activeGoals',
                filter: { status: 'ACTIVE' }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: weeklyAnalysisPrompt,
            schema: weeklyAnalysisSchema
          } as any
        },
        update: {
          name: 'Weekly Training Analysis',
          description:
            'Comprehensive analysis of the last 7 days of training including workouts, recovery metrics, and recommendations.',
          icon: 'i-heroicons-calendar',
          inputConfig: {
            sources: [
              {
                entity: 'workout',
                key: 'workouts',
                range: { type: 'days', value: 7 }
              },
              {
                entity: 'wellness',
                key: 'metrics',
                range: { type: 'days', value: 7 }
              },
              {
                entity: 'goal',
                key: 'activeGoals',
                filter: { status: 'ACTIVE' }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: weeklyAnalysisPrompt,
            schema: weeklyAnalysisSchema
          } as any
        }
      })

      // Upsert Last 3 Nutrition Days
      await prisma.reportTemplate.upsert({
        where: { id: '00000000-0000-0000-0000-000000000003' },
        create: {
          id: '00000000-0000-0000-0000-000000000003',
          name: 'Last 3 Days Nutrition',
          description:
            'Nutrition analysis of your last 3 days of dietary intake including macros, calories, and recommendations.',
          icon: 'i-heroicons-cake',
          isSystem: true,
          inputConfig: {
            sources: [
              {
                entity: 'nutrition',
                key: 'nutrition',
                range: { type: 'days', value: 3 }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: nutritionAnalysisPrompt.replace('{{days}}', '3'),
            schema: nutritionAnalysisSchema
          } as any
        },
        update: {
          name: 'Last 3 Days Nutrition',
          description:
            'Nutrition analysis of your last 3 days of dietary intake including macros, calories, and recommendations.',
          icon: 'i-heroicons-cake',
          inputConfig: {
            sources: [
              {
                entity: 'nutrition',
                key: 'nutrition',
                range: { type: 'days', value: 3 }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: nutritionAnalysisPrompt.replace('{{days}}', '3'),
            schema: nutritionAnalysisSchema
          } as any
        }
      })

      // Upsert Weekly Nutrition
      await prisma.reportTemplate.upsert({
        where: { id: '00000000-0000-0000-0000-000000000004' },
        create: {
          id: '00000000-0000-0000-0000-000000000004',
          name: 'Weekly Nutrition Analysis',
          description:
            'Comprehensive weekly nutrition analysis including patterns, consistency, and optimization opportunities.',
          icon: 'i-heroicons-cake',
          isSystem: true,
          inputConfig: {
            sources: [
              {
                entity: 'nutrition',
                key: 'nutrition',
                range: { type: 'days', value: 7 }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: nutritionAnalysisPrompt.replace('{{days}}', '7'),
            schema: nutritionAnalysisSchema
          } as any
        },
        update: {
          name: 'Weekly Nutrition Analysis',
          description:
            'Comprehensive weekly nutrition analysis including patterns, consistency, and optimization opportunities.',
          icon: 'i-heroicons-cake',
          inputConfig: {
            sources: [
              {
                entity: 'nutrition',
                key: 'nutrition',
                range: { type: 'days', value: 7 }
              }
            ]
          } as any,
          outputConfig: {
            promptTemplate: nutritionAnalysisPrompt.replace('{{days}}', '7'),
            schema: nutritionAnalysisSchema
          } as any
        }
      })

      console.log(chalk.green('Templates seeded successfully.'))
    } catch (e) {
      console.error(chalk.red('Error seeding templates:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillReportTemplatesCommand
