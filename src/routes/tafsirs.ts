import type { FastifyInstance } from "fastify"
import { qfGet, QfUnavailableError } from "../services/quranFoundationClient.js"
import { TtlCache } from "../services/ttlCache.js"
import { isQfConfigured } from "../config/env.js"
import { collectChapterTafsir, TAFSIR_PAGE_SIZE, type TafsirVerse, type UpstreamTafsirPage } from "../services/tafsirChapter.js"

interface TafsirResource {
  id: number
  name: string
  author_name: string
  language_name: string
}

interface TafsirsListResponse {
  tafsirs: TafsirResource[]
}

const listCache = new TtlCache<TafsirsListResponse>(24 * 60 * 60 * 1000)
// A whole chapter (all pages) per tafsir; large texts, so keep it for 6 hours, at most 40 entries (free-tier memory).
const chapterCache = new TtlCache<TafsirVerse[]>(6 * 60 * 60 * 1000, 40)

export default async function tafsirRoutes(app: FastifyInstance) {
  app.get("/api/v1/tafsirs", async (_req, reply) => {
    if (!isQfConfigured()) {
      reply.code(503)
      return { available: false, reason: "not_configured", tafsirs: [] }
    }
    try {
      const data = await listCache.getOrLoad("tafsirs_list", () =>
        qfGet<TafsirsListResponse>("/resources/tafsirs"),
      )
      return { available: true, tafsirs: data.tafsirs }
    } catch (err) {
      app.log.warn({ err }, "tafsirs list failed")
      reply.code(503)
      return { available: false, reason: "upstream_unavailable", tafsirs: [] }
    }
  })

  app.get<{ Params: { tafsirId: string; chapterNumber: string } }>(
    "/api/v1/tafsirs/:tafsirId/:chapterNumber",
    async (req, reply) => {
      if (!isQfConfigured()) {
        reply.code(503)
        return { available: false, reason: "not_configured" }
      }
      const { tafsirId, chapterNumber } = req.params
      try {
        const chapter = Number(chapterNumber)
        const verses = await chapterCache.getOrLoad(`${tafsirId}:${chapterNumber}`, () =>
          collectChapterTafsir(chapter, async (page) => {
            const params = { chapter_number: chapterNumber, per_page: String(TAFSIR_PAGE_SIZE), page: String(page) }
            try {
              return await qfGet<UpstreamTafsirPage>(`/quran/tafsirs/${tafsirId}`, { ...params, fields: "verse_key" })
            } catch (err) {
              // If the upstream rejects the optional fields parameter, retry plain; keys are derived from position.
              if (!(err instanceof QfUnavailableError)) throw err
              return qfGet<UpstreamTafsirPage>(`/quran/tafsirs/${tafsirId}`, params)
            }
          }),
        )
        return { available: true, verses }
      } catch (err) {
        if (err instanceof QfUnavailableError) {
          reply.code(503)
          return { available: false, reason: "upstream_unavailable" }
        }
        throw err
      }
    },
  )
}
