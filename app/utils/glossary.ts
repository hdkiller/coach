import { metricTooltips } from './tooltips'

export const glossary: Record<string, string> = {
  ...metricTooltips,
  'Zone 2':
    'Endurance Zone: 56-75% of FTP or 65-75% of Max HR. Builds mitochondrial density, fat oxidation, and aerobic base. "All day" pace.',
  'Neuromuscular Efficiency':
    'The ability of the nervous system to properly recruit muscle fibers to produce force. High efficiency means less energy wasted.',
  VI: metricTooltips['Variability Index']!,
  'Variability Index': metricTooltips['Variability Index']!,
  TSS: metricTooltips['TSS (Load)']!,
  IF: 'Intensity Factor: The ratio of Normalized Power to your FTP. 0.75 is steady endurance, 1.0 is a 1-hour time trial effort.',
  FTP: 'Functional Threshold Power: The highest power you can maintain for approximately one hour.',
  'VO2 Max':
    'Maximum Oxygen Uptake: The maximum amount of oxygen your body can utilize during intense exercise. A measure of aerobic ceiling.',
  'Aerobic Base':
    'The foundation of your fitness, built through low-intensity (Zone 2) volume. Determines your ability to recover and sustain effort.',
  'Anaerobic Capacity':
    'The ability to produce energy without oxygen for short, high-intensity efforts (sprints, surges).',
  Decoupling: metricTooltips['Aerobic Decoupling']!,
  'Pw:HR': metricTooltips['Aerobic Decoupling']!,
  EF: metricTooltips['Efficiency Factor']!,
  'W/kg': 'Watts per Kilogram: Power-to-weight ratio. A key predictor of climbing performance.',
  Cadence:
    'Pedaling rate in revolutions per minute (RPM). Higher cadence shifts stress from muscles to the cardiovascular system.',
  'Lactate Threshold':
    'The intensity at which lactate accumulates in the blood faster than it can be cleared. Roughly equivalent to FTP.',
  'Sweet Spot':
    '88-94% of FTP. A training intensity that balances physiological strain and recovery demand. "Hard but sustainable".',
  'Polarized Training':
    'A training model where ~80% of sessions are easy (Zone 1/2) and ~20% are very hard (Zone 5+), avoiding the middle "grey zone".',
  Taper:
    'A strategic reduction in training volume before a major event to shed accumulated fatigue while maintaining fitness.',
  Periodization:
    'Structuring training into distinct phases (e.g., Base, Build, Peak) to optimize performance for a specific time.',
  Bonking:
    'Glycogen depletion: Running out of stored muscle carbohydrate, resulting in a sudden, catastrophic loss of energy.',
  Intervals:
    'Periods of high-intensity effort alternating with periods of recovery. The most time-efficient way to build top-end fitness.',
  'Recovery Ride':
    'A very easy ride (Zone 1) designed to promote blood flow and clearance of metabolic waste without inducing fatigue.',
  Overreaching:
    'A planned, short-term accumulation of fatigue used to stimulate adaptation. Requires a subsequent rest period to "absorb" the training.',
  Overtraining:
    'A chronic state of fatigue and performance decline caused by an imbalance between training stress and recovery. Can take months to reverse.',
  'Critical Power':
    'The highest power output that can be sustained for a very long duration without fatigue occurring. Often used interchangeably with FTP.',
  'Zone 1': 'Active Recovery: <55% FTP. Very easy spinning to promote blood flow.',
  'Zone 3': 'Tempo: 76-90% FTP. "Spirited" riding. Harder than endurance but sustainable.',
  'Zone 4': 'Threshold: 91-105% FTP. Race pace or time trial effort. Hard and uncomfortable.',
  'Zone 5': 'VO2 Max: 106-120% FTP. Very hard efforts (3-8 min). Gasping for breath.',
  'Zone 6': 'Anaerobic: >121% FTP. Short, explosive efforts (30s - 3 min). Painful.'
}

// Helper to sort keys by length descending to match longest phrases first
export const sortedGlossaryKeys = Object.keys(glossary).sort((a, b) => b.length - a.length)
