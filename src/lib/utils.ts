// ============================================================
// SLEC – Shared Utilities
// ============================================================

/**
 * Format a number with thousands separator.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format storage size in MB to a readable string.
 */
export function formatStorageSize(mb: number): string {
  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}
