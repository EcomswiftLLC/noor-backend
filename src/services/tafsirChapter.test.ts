import { test } from "node:test"
import assert from "node:assert/strict"
import { collectChapterTafsir, verseKeyFor, type UpstreamTafsirPage } from "./tafsirChapter.js"

function pages(total: number, perPage: number, withKey: boolean): (n: number) => Promise<UpstreamTafsirPage> {
  return async (page) => {
    const start = (page - 1) * perPage
    const count = Math.max(0, Math.min(perPage, total - start))
    const tafsirs = Array.from({ length: count }, (_, i) => ({
      text: `t${start + i + 1}`,
      ...(withKey ? { verse_key: `2:${start + i + 1}` } : {}),
    }))
    const totalPages = Math.ceil(total / perPage)
    return { tafsirs, pagination: { next_page: page < totalPages ? page + 1 : null, total_pages: totalPages } }
  }
}

test("walks every page and keeps upstream verse keys", async () => {
  const verses = await collectChapterTafsir(2, pages(286, 50, true))
  assert.equal(verses.length, 286)
  assert.equal(verses[0].verse_key, "2:1")
  assert.equal(verses[285].verse_key, "2:286")
  assert.equal(verses[285].text, "t286")
})

test("derives verse keys by position when upstream omits them", async () => {
  const verses = await collectChapterTafsir(2, pages(120, 50, false))
  assert.equal(verses.length, 120)
  assert.deepEqual(verses.slice(9, 12).map((v) => v.verse_key), ["2:10", "2:11", "2:12"])
})

test("stops on a full page when the server sends no pagination object", async () => {
  let calls = 0
  const verses = await collectChapterTafsir(3, async (page) => {
    calls++
    const n = page === 1 ? 50 : 7
    return { tafsirs: Array.from({ length: n }, (_, i) => ({ text: `x${page}-${i}` })) }
  })
  assert.equal(calls, 2)
  assert.equal(verses.length, 57)
})

test("a short chapter takes one request", async () => {
  let calls = 0
  const verses = await collectChapterTafsir(1, async () => {
    calls++
    return { tafsirs: [{ text: "a" }, { text: "b" }], pagination: { next_page: null } }
  })
  assert.equal(calls, 1)
  assert.deepEqual(verses.map((v) => v.verse_key), ["1:1", "1:2"])
})

test("never loops forever on a server that keeps sending pages", async () => {
  let calls = 0
  await collectChapterTafsir(2, async (page) => {
    calls++
    return { tafsirs: [{ text: "z" }], pagination: { next_page: page + 1 } }
  })
  assert.ok(calls <= 16)
})

test("verseKeyFor prefers key, then verse number, then position", () => {
  assert.equal(verseKeyFor(5, { verse_key: "5:8" }, 1), "5:8")
  assert.equal(verseKeyFor(5, { verse_number: 9 }, 1), "5:9")
  assert.equal(verseKeyFor(5, {}, 4), "5:4")
  assert.equal(verseKeyFor(5, { verse_key: "junk" }, 4), "5:4")
})

import { TtlCache } from "./ttlCache.js"
test("TtlCache evicts the oldest entry beyond its limit", () => {
  const c = new TtlCache<number>(60_000, 2)
  c.set("a", 1); c.set("b", 2); c.set("c", 3)
  assert.equal(c.get("a"), undefined)
  assert.equal(c.get("b"), 2)
  assert.equal(c.get("c"), 3)
})
