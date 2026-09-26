import type { FastifyInstance } from "fastify"
import { qfGet, QfUnavailableError } from "../services/quranFoundationClient.js"
import { TtlCache } from "../services/ttlCache.js"
import { isQfConfigured } from "../config/env.js"

interface TranslationResource {
  id: number
  name: string
  author_name: string
  language_name: string
}

interface TranslationsListResponse {
  translations: TranslationResource[]
}

interface TranslatedVerse {
  verse_key: string
  text: string
}

interface TranslationByChapterResponse {
  translations: TranslatedVerse[]
}

const listCache = new TtlCache<TranslationsListResponse>(24 * 60 * 60 * 1000) // 24h

export default async function translationRoutes(app: FastifyInstance) {
  app.get("/api/v1/translations", async (_req, reply) => {
    if (!isQfConfigured()) {
      reply.code(503)
      return { available: false, reason: "not_configured", translations: [] }
    }
    try {
      const data = await listCache.getOrLoad("translations_list", () =>
        qfGet<TranslationsListResponse>("/resources/translations"),
      )
      return { available: true, translations: data.translations }
    } catch (err) {
      app.log.warn({ err }, "translations list failed")
      reply.code(503)
      return { available: false, reason: "upstream_unavailable", translations: [] }
    }
  })

  app.get<{ Params: { translationId: string; chapterNumber: string } }>(
    "/api/v1/translations/:translationId/:chapterNumber",
    async (req, reply) => {
      if (!isQfConfigured()) {
        reply.code(503)
        return { available: false, reason: "not_configured" }
      }
      const { translationId, chapterNumber } = req.params
      try {
        const data = await qfGet<TranslationByChapterResponse>(
          `/quran/translations/${translationId}`,
          { chapter_number: chapterNumber },
        )
        return { available: true, verses: data.translations }
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
