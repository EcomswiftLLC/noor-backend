import type { FastifyInstance } from "fastify"
import { qfGet, QfUnavailableError } from "../services/quranFoundationClient.js"
import { TtlCache } from "../services/ttlCache.js"
import { isQfConfigured } from "../config/env.js"

interface TafsirResource {
  id: number
  name: string
  author_name: string
  language_name: string
}

interface TafsirsListResponse {
  tafsirs: TafsirResource[]
}

interface TafsirByChapterResponse {
  tafsirs: Array<{ verse_key: string; text: string }>
}

const listCache = new TtlCache<TafsirsListResponse>(24 * 60 * 60 * 1000)

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
        const data = await qfGet<TafsirByChapterResponse>(`/quran/tafsirs/${tafsirId}`, {
          chapter_number: chapterNumber,
        })
        return { available: true, verses: data.tafsirs }
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
