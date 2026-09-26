import { test } from "node:test"
import assert from "node:assert/strict"
import { buildApp } from "../app.js"

test("GET /api/v1/health returns ok status", async () => {
  const app = await buildApp()
  const response = await app.inject({ method: "GET", url: "/api/v1/health" })
  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.equal(body.status, "ok")
  assert.ok(body.version)
  assert.ok(body.timestamp)
})

test("GET /api/v1/config reports audio/translations unavailable without QF credentials", async () => {
  const app = await buildApp()
  const response = await app.inject({ method: "GET", url: "/api/v1/config" })
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().audioTranslationsAvailable, false)
})

test("GET /api/v1/content/manifest never fails even without QF credentials", async () => {
  const app = await buildApp()
  const response = await app.inject({ method: "GET", url: "/api/v1/content/manifest" })
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().remoteContentAvailable, false)
})
