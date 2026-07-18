/**
 * Display-only formatting helpers. §6's "General rule": quantity fields are
 * numeric in storage (agorot for price, minutes for reading_time, seconds
 * for podcast duration) — formatting into a human string is a rendering
 * concern applied here, at display time, never baked into stored data.
 */

/** `price` is stored as an integer in agorot (smallest currency unit) or
 * null if unset (§6 trainings.price) — never a formatted string in the DB. */
export function formatPrice(agorot: number | null): string | null {
  if (agorot === null) return null;
  const ils = agorot / 100;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: ils % 1 === 0 ? 0 : 2,
  }).format(ils);
}

/** `duration` is stored as an integer in seconds (§6 podcast_episodes.duration). */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")} דקות`;
}

/** `reading_time` is stored as an integer in minutes (§6 posts.reading_time). */
export function formatReadingTime(minutes: number): string {
  return `זמן קריאה: ${minutes} דקות`;
}

/** `academic_hours` is stored as a plain integer (§6 trainings.academic_hours). */
export function formatHours(hours: number): string {
  return `${hours} שעות אקדמיות`;
}
