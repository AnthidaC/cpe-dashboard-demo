/** Reserve plot space first; labels adapt to the card, not the viewport. */
export function horizontalChartLayout(width: number, requestedLabelWidth?: number, showNames = true) {
  const compact = showNames && width < 460;
  const defaultWidth = 185; // Optimized for clean 1-line aliases (12–22 visual chars)
  const targetWidth = requestedLabelWidth ?? defaultWidth;
  return { compact, labelWidth: compact ? 0 : Math.min(targetWidth, Math.round(width * 0.38)) };
}

/**
 * Compute adaptive height for horizontal ranking charts so that 5-item, 7-item,
 * 10-item, and full lists each get proportional vertical spacing without dead space.
 */
export function getRankingChartHeight(
  visibleCount: number,
  limit: number | 'all',
  options?: { baseHeight?: number; rowHeight?: number; chromeHeight?: number; minHeight?: number }
): number {
  const baseHeight = options?.baseHeight ?? 380;
  const rowHeight = options?.rowHeight ?? 42;
  const chromeHeight = options?.chromeHeight ?? 74;
  const minHeight = options?.minHeight ?? 248;

  if (visibleCount <= 0) return 180;
  const contentHeight = visibleCount * rowHeight + chromeHeight;

  if (limit === 'all') {
    return Math.max(minHeight, contentHeight);
  }
  if (limit === 5 || visibleCount <= 5) {
    return Math.max(minHeight, Math.min(296, contentHeight));
  }
  return Math.max(minHeight, Math.min(baseHeight, contentHeight));
}

