import type { FastifyInstance } from "fastify"
import { env, isQfConfigured } from "../config/env.js"

/**
 * Content manifest: version markers only, never Quran text itself. The app
 * polls this in the background to know whether new translations/tafsir/
 * reciters are available - it must never block app startup and a failure
 * here must never surface as an error to the reader (see docs/OFFLINE_MODE.md).
 */
export default async function configRoutes(app: FastifyInstance) {
  app.get("/api/v1/config", async () => ({
    minSupportedAppVersion: env.minSupportedAppVersion,
    audioTranslationsAvailable: isQfConfigured(),
  }))

  app.get("/api/v1/content/manifest", async () => ({
    quranTextVersion: "tanzil-uthmani-1.0.2",
    manifestVersion: 1,
    minSupportedAppVersion: env.minSupportedAppVersion,
    remoteContentAvailable: isQfConfigured(),
    generatedAt: new Date().toISOString(),
  }))
}
