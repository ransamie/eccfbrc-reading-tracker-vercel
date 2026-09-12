/**
 * Utility functions for formatting and normalizing team names cleanly across the ECCFBRC platform.
 */

export function toTitleCase(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, boundary, letter) => boundary + letter.toUpperCase());
}

export function formatTeamName(team) {
  if (!team) return '';
  const trimmed = String(team).trim();
  if (/^team\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Team ${trimmed}`;
}

export function formatTeamUpper(team) {
  if (!team) return '';
  return formatTeamName(team).toUpperCase();
}

export function normalizeTeamKey(team) {
  return String(team || '')
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
