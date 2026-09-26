import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import { env } from "./config/env.js"
import { buildApp } from "./app.js"

const app = await buildApp()

await app.register(cors, {
  origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
})

// Public, read-only content endpoints - keep this lightweight but not wide open.
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
})

app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
