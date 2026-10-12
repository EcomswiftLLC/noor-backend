import { test } from "node:test"
import assert from "node:assert/strict"
import { toVerseTimestamps } from "./audioTimestamps.js"

test("toVerseTimestamps keeps verse spans and drops word segments", () => {
  const result = toVerseTimestamps([
    { verse_key: "1:1", timestamp_from: 0, timestamp_to: 6090, duration: 6090, segments: [[1, 0, 580]] },
    { verse_key: "1:2", timestamp_from: 6090.4, timestamp_to: 11680, segments: [] },
  ])
  assert.deepEqual(result, [
    { verse_key: "1:1", timestamp_from: 0, timestamp_to: 6090 },
    { verse_key: "1:2", timestamp_from: 6090, timestamp_to: 11680 },
  ])
})

test("toVerseTimestamps skips malformed rows and returns undefined when nothing usable", () => {
  assert.equal(toVerseTimestamps(undefined), undefined)
  assert.equal(toVerseTimestamps("nope"), undefined)
  assert.equal(toVerseTimestamps([{ verse_key: "x", timestamp_from: 0, timestamp_to: 1 }]), undefined)
  assert.deepEqual(
    toVerseTimestamps([
      null,
      { verse_key: "2:1", timestamp_from: 5, timestamp_to: 2 },
      { verse_key: "2:2", timestamp_from: 10, timestamp_to: 20 },
    ]),
    [{ verse_key: "2:2", timestamp_from: 10, timestamp_to: 20 }],
  )
})
