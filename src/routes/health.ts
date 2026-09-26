import type { FastifyInstance } from "fastify"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8")) as { version: string }

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/api/v1/health", async () => ({
    status: "ok",
    version: pkg.version,
    timestamp: new Date().toISOString(),
  }))
}
