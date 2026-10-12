/** One ayah's span inside a chapter recording, in milliseconds. */
export interface VerseTimestamp {
  verse_key: string
  timestamp_from: number
  timestamp_to: number
}

/**
 * Normalizes Quran Foundation's `timestamps` array (returned by
 * /chapter_recitations/{reciter}/{chapter}?segments=true) into the compact
 * per-ayah shape the app needs. Word-level `segments` are dropped to keep the
 * payload small; malformed rows are skipped rather than failing the response.
 */
export function toVerseTimestamps(raw: unknown): VerseTimestamp[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: VerseTimestamp[] = []
  for (const row of raw) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const key = r.verse_key
    const from = Number(r.timestamp_from)
    const to = Number(r.timestamp_to)
    if (typeof key !== "string" || !/^\d+:\d+$/.test(key)) continue
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue
    out.push({ verse_key: key, timestamp_from: Math.round(from), timestamp_to: Math.round(to) })
  }
  return out.length > 0 ? out : undefined
}
