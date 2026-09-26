import Fastify, { type FastifyInstance } from "fastify"
import healthRoutes from "./routes/health.js"
import configRoutes from "./routes/config.js"
import reciterRoutes from "./routes/reciters.js"
import translationRoutes from "./routes/translations.js"
import tafsirRoutes from "./routes/tafsirs.js"

/** Builds the Fastify app without starting the HTTP listener - used by both
 * the production entrypoint (index.ts) and tests. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(healthRoutes)
  await app.register(configRoutes)
  await app.register(reciterRoutes)
  await app.register(translationRoutes)
  await app.register(tafsirRoutes)

  app.setErrorHandler((error, _req, reply) => {
    app.log.error({ err: error }, "unhandled route error")
    reply.code(500).send({ available: false, reason: "internal_error" })
  })

  return app
}
