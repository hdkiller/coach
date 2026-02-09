# Nutrition System

## Overview

Coach Wattz features a professional-grade, **Dynamic Periodized Fueling** system. Unlike standard calorie trackers, it calculates nutritional targets based on the **Energy Demand** and **Intensity** of planned and completed training.

The core logic is anchored in "Fuel for the Work Required" and "Train High, Sleep Low" periodization models, allowing athletes to optimize their metabolic flexibility and performance.

## Metabolic Baselines

The foundation of the nutrition system is the user's metabolic profile:

- **BMR (Basal Metabolic Rate)**: Automatically calculated using the **Mifflin-St Jeor** formula based on age, height, weight, and sex.
- **NEAT (Daily Activity Level)**: A Physical Activity Level (PAL) multiplier applied to BMR to estimate **Total Daily Energy Expenditure (TDEE)**.
- **Target Calories**: The final daily calorie goal, adjusted based on the user's **Goal Profile** (Lose, Maintain, Gain) and custom **Aggressiveness** percentages.

## Core Concepts

### 1. Fuel States

The system categorizes physiological demand into three "Fuel States" based on Intensity Factor (IF):

| Fuel State               | Description       | Typical Intensity | Carbohydrate Focus                           |
| :----------------------- | :---------------- | :---------------- | :------------------------------------------- |
| **State 1: Eco**         | Recovery / Easy   | IF < 0.60         | Fat oxidation focus, low glycogen demand.    |
| **State 2: Steady**      | Endurance / Tempo | IF 0.60 - 0.85    | Balanced fueling, moderate glycogen demand.  |
| **State 3: Performance** | Threshold / Race  | IF > 0.85         | High glycolytic demand, prioritized fueling. |

Users can **calibrate** these triggers and the associated g/kg carbohydrate ranges in their Professional settings.

### 2. Fueling Sensitivity

A global multiplier (80% to 120%) that scales all carbohydrate targets.

- **Low Sensitivity (80-95%)**: Suited for "Fat Adapted" athletes or those in a base/weight-loss phase.
- **High Sensitivity (105-120%)**: Suited for "Sugar Burners" or athletes in high-volume, high-intensity build blocks.

### 3. Adaptive Metabolic Engine

The system fine-tunes targets based on:

- **Carb-to-Intensity Slope**: Controls how aggressively fuel targets increase as workout intensity rises.
- **Gut Training Limits**: Tracks current vs. target carbohydrate absorption rates (g/hr) to safely build digestive capacity during training.
- **Macro Baselines**: Configurable daily protein and fat targets relative to body weight (g/kg).

### 4. Season Blocks (Training Phases)

Athletes can apply metabolic presets based on their current season focus:

- **Base Phase**: Higher protein/fat, lower carb scaling to enhance recovery and metabolic efficiency.
- **Build Phase**: Balanced macro distribution with moderate carb scaling for performance.
- **Taper / Race Week**: Prioritized carbohydrate loading and optimized fueling for peak output.

## Dietary Constraints ("Non-Negotiables")

To ensure AI-generated advice is safe and individualized, the system tracks four distinct layers of dietary needs:

1.  **Dietary Profile**: General patterns like Vegan, Keto, or Paleo.
2.  **Food Allergies**: Strict avoidance of immune-triggering foods (e.g., Peanuts, Shellfish).
3.  **Food Intolerances**: Avoidance of foods causing digestive or metabolic distress (e.g., Lactose, Fructose).
4.  **Lifestyle Exclusions**: Strict avoidance of specific ingredients for health/performance (e.g., Seed Oils, Refined Sugar, Alcohol).

## Advanced Protocols

### Train Low

The system supports "Train Low" (low glycogen availability) protocols to boost mitochondrial biogenesis. When a workout is flagged as `TRAIN_LOW`:

- **Pre-Workout**: Carbs are minimized (<10g).
- **Intra-Workout**: Carbs are zeroed out (Water + Electrolytes only).
- **Post-Workout**: Protein targets are increased to support muscle repair while glycogen replenishment is strategically managed.

## Hydration Precision

Calculates fluid and electrolyte replacement needs based on:

- **Sweat Rate (L/hr)**: Fluid loss per hour of exercise.
- **Sodium Concentration (mg/L)**: Sodium lost per liter of sweat.
- **Timing Windows**: Configurable lead times for pre-workout hydration and post-workout recovery windows.

## Bio-Optimization Stack

Tracks usage of performance-enhancing supplements to provide AI-powered timing and dosage advice based on workout intensity:

- **Caffeine**: Focus and fatigue reduction.
- **Nitrates**: Blood flow and oxygen delivery.
- **Beta-Alanine**: Acid buffering.
- **Sodium Bicarbonate**: Intracellular buffering.
- **Glycerol**: Hyperhydration.
- **Creatine, Collagen, Tart Cherry**: Recovery and structural support.
