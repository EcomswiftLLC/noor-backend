/**
 * Collects a whole chapter of tafsir from the Quran Foundation content API.
 *
 * The upstream endpoint is paginated (10 records per page unless asked otherwise) and, depending on
 * the resource, may omit `verse_key`. This module walks every page and always returns one entry per
 * record with a usable `verse_key`, so clients can look an ayah up by key.
 */

export interface UpstreamTafsirItem {
  verse_key?: string
  verse_number?: number
  text?: string
}

export interface UpstreamTafsirPage {
  tafsirs?: UpstreamTafsirItem[]
  pagination?: { next_page?: number | null; total_pages?: number | null } | null
}

export interface TafsirVerse {
  verse_key: string
  text: string
}

export const TAFSIR_PAGE_SIZE = 50
const MAX_PAGES = 16 // 286 ayat / 50 = 6 pages for the longest surah; 16 is a hard safety stop

export type FetchTafsirPage = (page: number) => Promise<UpstreamTafsirPage>

/** Verse key of a record: the upstream key, else chapter plus verse number, else its position in the chapter. */
export function verseKeyFor(chapter: number, item: UpstreamTafsirItem, position: number): string {
  const key = item.verse_key?.trim()
  if (key && /^\d+:\d+$/.test(key)) return key
  if (typeof item.verse_number === "number" && item.verse_number > 0) return `${chapter}:${item.verse_number}`
  return `${chapter}:${position}`
}

export async function collectChapterTafsir(chapter: number, fetchPage: FetchTafsirPage): Promise<TafsirVerse[]> {
  const out: TafsirVerse[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchPage(page)
    const items = data.tafsirs ?? []
    for (const item of items) {
      out.push({ verse_key: verseKeyFor(chapter, item, out.length + 1), text: item.text ?? "" })
    }
    const next = data.pagination?.next_page
    // Follow the server's own pagination when it sends it; otherwise a full page means there may be more.
    const more = data.pagination ? next != null && next > page : items.length >= TAFSIR_PAGE_SIZE
    if (!more || items.length === 0) break
  }
  return out
}
