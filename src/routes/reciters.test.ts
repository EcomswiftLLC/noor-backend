import { test } from "node:test"
import assert from "node:assert/strict"
import { buildApp } from "../app.js"

test("GET /api/v1/reciters degrades gracefully (503, not_configured) without QF credentials", async () => {
  const app = await buildApp()
  const response = await app.inject({ method: "GET", url: "/api/v1/reciters" })
  assert.equal(response.statusCode, 503)
  const body = response.json()
  assert.equal(body.available, false)
  assert.equal(body.reason, "not_configured")
  assert.deepEqual(body.reciters, [])
})

test("GET /api/v1/audio/:reciterId/:chapterNumber degrades gracefully without QF credentials", async () => {
  const app = await buildApp()
  const response = await app.inject({ method: "GET", url: "/api/v1/audio/7/1" })
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().available, false)
})
