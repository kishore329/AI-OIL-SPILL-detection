// ─────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────

/**
 * Format a date string to human-readable format.
 */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(isoString));
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert severity to a Tailwind color class.
 */
export function severityColor(
  severity: "low" | "medium" | "high" | "critical"
): string {
  const map = {
    low: "text-success-400",
    medium: "text-spill-400",
    high: "text-orange-400",
    critical: "text-danger-400",
  };
  return map[severity];
}

/**
 * Generate a unique ID (for client-side use only).
 */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
