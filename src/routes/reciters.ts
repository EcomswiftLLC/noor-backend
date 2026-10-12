import type { FastifyInstance } from "fastify"
import { qfGet, QfUnavailableError } from "../services/quranFoundationClient.js"
import { TtlCache } from "../services/ttlCache.js"
import { isQfConfigured } from "../config/env.js"
import { toVerseTimestamps } from "../services/audioTimestamps.js"

interface ChapterRecitersResponse {
  reciters: Array<{
    id: number
    name: string
    style?: { name: string }
    translated_name?: { name: string }
  }>
}

interface ChapterAudioFileResponse {
  // QF's /chapter_recitations/{reciterId}/{chapterNumber} returns a single
  // audio_file object (not an audio_files array).
  audio_file: {
    id: number
    chapter_id: number
    file_size: number
    format: string
    audio_url: string
    // Present only when requested with segments=true.
    timestamps?: unknown
  } | null
}

const recitersCache = new TtlCache<ChapterRecitersResponse>(6 * 60 * 60 * 1000) // 6h - rarely changes

export default async function reciterRoutes(app: FastifyInstance) {
  app.get("/api/v1/reciters", async (_req, reply) => {
    if (!isQfConfigured()) {
      reply.code(503)
      return { available: false, reason: "not_configured", reciters: [] }
    }
    try {
      const data = await recitersCache.getOrLoad("chapter_reciters", () =>
        qfGet<ChapterRecitersResponse>("/resources/chapter_reciters"),
      )
      return { available: true, reciters: data.reciters }
    } catch (err) {
      app.log.warn({ err }, "reciters lookup failed")
      reply.code(503)
      return { available: false, reason: "upstream_unavailable", reciters: [] }
    }
  })

  app.get<{ Params: { reciterId: string; chapterNumber: string }; Querystring: { segments?: string } }>(
    "/api/v1/audio/:reciterId/:chapterNumber",
    async (req, reply) => {
      if (!isQfConfigured()) {
        reply.code(503)
        return { available: false, reason: "not_configured" }
      }
      const { reciterId, chapterNumber } = req.params
      // segments=true asks QF for per-ayah timestamps, which the app uses to
      // highlight the ayah being recited. Older app builds never send it.
      const withSegments = req.query.segments === "true"
      try {
        const data = await qfGet<ChapterAudioFileResponse>(
          `/chapter_recitations/${reciterId}/${chapterNumber}`,
          withSegments ? { segments: "true" } : undefined,
        )
        // QF sometimes returns file_size as a float (e.g. 371.65); the Android
        // client parses it as a Long, so normalize to a whole number of bytes.
        const audio = data.audio_file
          ? (() => {
              const { timestamps, ...file } = data.audio_file
              const verseTimestamps = withSegments ? toVerseTimestamps(timestamps) : undefined
              return {
                ...file,
                file_size: Math.round(Number(file.file_size) || 0),
                ...(verseTimestamps ? { timestamps: verseTimestamps } : {}),
              }
            })()
          : null
        return { available: true, audio }
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
