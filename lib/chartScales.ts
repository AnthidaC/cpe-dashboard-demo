export interface LinearChartScale {
  min: number;
  max: number;
  step: number;
}

/** Keep a requested interval only while it produces a readable number of ticks. */
export function getChartStepSize(
  values: (number | null)[],
  stepSize?: number,
  min?: number,
  max?: number,
): number | undefined {
  if (stepSize === undefined || !Number.isFinite(stepSize) || stepSize <= 0) return undefined;
  let lowest = min ?? 0;
  let highest = max ?? lowest;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    lowest = Math.min(lowest, value);
    highest = Math.max(highest, value);
  }
  return (highest - lowest) / stepSize <= 7 ? stepSize : undefined;
}

/** Add room around points, then round bounds to readable tick intervals. */
export function getLinearChartScale(values: number[], options: {
  minSpan: number;
  lowerBound?: number;
  upperBound?: number;
  fallback: LinearChartScale;
}): LinearChartScale {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return options.fallback;

  const lowest = Math.min(...finite);
  const highest = Math.max(...finite);
  const span = Math.max(highest - lowest, options.minSpan);
  const center = (lowest + highest) / 2;
  let min = center - span * 0.62;
  let max = center + span * 0.62;

  if (options.upperBound !== undefined && max > options.upperBound) {
    min -= max - options.upperBound;
    max = options.upperBound;
  }
  if (options.lowerBound !== undefined && min < options.lowerBound) {
    max += options.lowerBound - min;
    min = options.lowerBound;
  }
  if (options.upperBound !== undefined) max = Math.min(max, options.upperBound);

  const rawStep = (max - min) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const interval = [1, 2, 2.5, 5, 10].find(value => value >= fraction) ?? 10;
  const step = interval * magnitude;
  const round = (value: number) => Number(value.toPrecision(12));

  return {
    min: round(Math.max(options.lowerBound ?? -Infinity, Math.floor(min / step) * step)),
    max: round(Math.min(options.upperBound ?? Infinity, Math.ceil(max / step) * step)),
    step: round(step),
  };
}
