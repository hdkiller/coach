export interface MetricDefinition {
  label: string
  description: string
  coachingTip?: string
}

export const metricDefinitions: Record<string, MetricDefinition> = {
  'Training Load': {
    label: 'Training Load (TSS)',
    description:
      'Training Stress Score (TSS) is a composite number that takes into account the duration and intensity of a workout to arrive at a single estimate of the total physiological stress.',
    coachingTip:
      '100 TSS is equivalent to 1 hour at your threshold. If you feel exceptionally tired but TSS is low, check your wellness scores—you might be under-recovering.'
  },
  'Avg HR': {
    label: 'Average Heart Rate',
    description:
      'The average number of heart beats per minute during the entire session. This is a primary indicator of internal physiological strain.',
    coachingTip:
      'Higher than normal HR for a given power output often indicates fatigue, dehydration, or incoming illness.'
  },
  'Avg Power': {
    label: 'Average Power Output',
    description:
      'The mathematical average of your power output (measured in Watts) for the duration of the workout.',
    coachingTip:
      'Focus on "Normalized Power" for variable rides, but keep an eye on Average Power for steady-state intervals to ensure consistent execution.'
  },
  'Variability Index': {
    label: 'Variability Index (VI)',
    description:
      'Calculated by dividing Normalized Power by Average Power. It measures how "steady" your power delivery was during the ride.',
    coachingTip:
      'A VI of 1.0 to 1.05 is ideal for steady-state triathlon or time trial efforts. High VI (>1.1) indicates a "surgy" ride which is metabolically more expensive.'
  },
  'Efficiency Factor': {
    label: 'Efficiency Factor (EF)',
    description:
      'Normalizes your power output against your heart rate (NP / Avg HR). It tracks how much "work" you get for every beat of your heart.',
    coachingTip:
      'As your aerobic fitness improves, your EF will gradually trend upward. Compare EF across similar workout types to see real progress.'
  },
  'Aerobic Decoupling': {
    label: 'Aerobic Decoupling (Pa:Hr)',
    description:
      'The percentage difference in the Power:HR ratio between the first and second halves of a workout. It measures aerobic stability.',
    coachingTip:
      'Decoupling under 5% indicates good aerobic endurance. If you see >10%, it means your cardiovascular system is struggling to maintain output, often due to heat or lack of base fitness.'
  },
  'Power/HR Ratio': {
    label: 'Power/HR Ratio',
    description:
      'A raw snapshot of your efficiency: how many Watts you generate per heart beat (bpm).',
    coachingTip:
      'This is your "Gross Efficiency". While it varies by intensity, tracking it over time at a specific heart rate (like Zone 2) is a pure measure of aerobic engine growth.'
  },
  'Norm Power': {
    label: 'Normalized Power (NP)',
    description:
      'An estimate of the power you could have maintained for the same physiological "cost" if your output had been perfectly steady.',
    coachingTip:
      'NP accounts for the exponential cost of hard surges. If NP is significantly higher than Average Power, your session was very punchy.'
  },
  'TSS (Load)': {
    label: 'Training Stress Score (TSS)',
    description:
      'A way of measuring how much physical stress a workout has put on your body. It considers both duration and intensity.',
    coachingTip:
      'This is the specific stress of this activity. Aim for your "Target TSS" in planned workouts to stay on track with your long-term plan.'
  },
  'Fitness (CTL)': {
    label: 'Chronic Training Load (Fitness)',
    description:
      'A rolling 42-day average of your daily TSS. It represents your long-term training load and aerobic base.',
    coachingTip:
      "Higher isn't always better. Focus on a sustainable rate of increase (ramp rate) to avoid injury."
  },
  'Fatigue (ATL)': {
    label: 'Acute Training Load (Fatigue)',
    description:
      'A rolling 7-day average of your daily TSS. It represents the short-term stress of your recent training.',
    coachingTip:
      'High fatigue is normal after a big block, but it must be followed by recovery to allow for adaptation.'
  },
  'Form (TSB)': {
    label: 'Training Stress Balance (Form)',
    description:
      'Calculated as CTL minus ATL. It represents how "fresh" or "tired" you are relative to your long-term base.',
    coachingTip:
      'Optimal "Race Form" is usually between +5 and +25. Deep training blocks often see values down to -30.'
  },
  'Average Pace': {
    label: 'Average Session Pace',
    description:
      'The average time taken to cover a specific distance unit (e.g., minutes per kilometer).',
    coachingTip:
      'Pace is a "result" metric. Always consider it alongside heart rate to determine if your speed is coming from efficiency or raw effort.'
  },
  'Consistency Variance': {
    label: 'Pace Variability (Consistency)',
    description:
      'Measures how much your pace fluctuated during the session. Low variance means steady execution.',
    coachingTip:
      'For steady-state runs or rides, aim for minimal variance. High variance is expected in interval sessions or hilly terrain.'
  },
  'Execution Strategy': {
    label: 'Pacing Strategy Audit',
    description:
      'Analyzes the distribution of effort between the first and second halves of your session.',
    coachingTip:
      'Negative splits (faster second half) are usually the most efficient way to race and indicate disciplined energy management.'
  },
  'Intensity Factor': {
    label: 'Intensity Factor (IF)',
    description:
      'The ratio of your Normalized Power to your current Functional Threshold Power (FTP).',
    coachingTip:
      'An IF of 1.0 means you rode at exactly your threshold for the duration. Recovery rides should be below 0.60.'
  },
  'Work > FTP': {
    label: 'Anaerobic Work Capacity',
    description:
      'The total amount of energy (in kilojoules) expended while riding above your threshold power.',
    coachingTip:
      'This represents your "matches" burnt. High work above FTP indicates a very hard anaerobic session.'
  },
  "W' Bal Depletion": {
    label: "W' Balance Depletion",
    description:
      "Tracks the remaining capacity of your anaerobic energy tank. It shows how 'deep' you dug during hard efforts.",
    coachingTip:
      'If this drops near zero, you are likely at your limit. Improving your threshold will allow you to maintain higher power with less depletion.'
  },
  'Durability (Late Fade)': {
    label: 'Durability (Metabolic Late Fade)',
    description:
      'Measures the loss of efficiency by comparing your Power:HR ratio from the beginning of the workout to the end.',
    coachingTip:
      'Excellent durability is < 5% fade. If you consistently fade > 10%, focus on long Zone 2 rides to build your aerobic base.'
  },
  'Force / Velocity Profile': {
    label: 'Force / Velocity Profile',
    description:
      'Categorizes your pedaling style into quadrants: high/low force and high/low velocity (cadence).',
    coachingTip:
      'Use this to see if you are a "grinder" (high force, low cadence) or a "spinner" (low force, high cadence) and if that matches your target race intensity.'
  },
  'Coasting Efficiency': {
    label: 'Coasting Efficiency',
    description:
      'The amount of time you spent moving without pedaling. In group rides or races, higher coasting time often indicates better tactical discipline.',
    coachingTip:
      'In a draft, you should coast as much as possible. High coasting percentages on solo rides usually mean a very hilly course.'
  },
  'Sustained Surges': {
    label: 'Matches Burnt (Surges)',
    description:
      'Counts the number of times you pushed significantly above your threshold (>120% FTP) for a sustained duration.',
    coachingTip:
      'Every "match" burnt takes a toll. If you burn too many early in a race, you\'ll have nothing left for the final sprint.'
  }
}
