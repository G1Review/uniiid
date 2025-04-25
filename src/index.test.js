import test from "node:test";
import assert from "node:assert/strict";
import { createID } from "./index.js";

test("createID rejects bad masks", () => {
  assert.throws(() => createID("", false), {
    name: "TypeError",
    message: /non-empty/,
  });

  assert.throws(() => createID("A", false), {
    name: "TypeError",
    message: /Invalid mask character "A" at position 0/,
  });

  assert.throws(() => createID("X9", "nope"), {
    name: "TypeError",
    message: /Crypto must be boolean/,
  });
});

test("uniques & bits for simple masks", () => {
  const id1 = createID("X");
  // LETTERS.length == 13
  assert.equal(id1.uniques, 13);
  assert.equal(id1.bits, Math.ceil(Math.log2(13)));

  const id2 = createID("99");
  assert.equal(id2.uniques, 10 * 10);
  assert.equal(id2.bits, Math.ceil(Math.log2(100)));

  const id3 = createID("X9-9X");
  // 13 * 10 * 1 * 10 * 13
  assert.equal(id3.uniques, 13 * 10 * 1 * 10 * 13);
  assert.equal(id3.mask, "X9-9X");
});

test("crypto flag validation", () => {
  // a mask with <128 bits should throw when crypto=true
  const shortMask = "X".repeat(5); // 13^5 combinations < 2^128
  assert.throws(() => createID(shortMask, true), /not crypto-safe: only \d+ bits/);

  // a mask with enough entropy passes
  const mixMask = "X".repeat(20) + "9".repeat(20);
  const idSafe = createID(mixMask, true);
  assert.equal(idSafe.crypto, true);
  assert(idSafe.bits >= 128);
});

test("random()", () => {
  const mask = "X9-9X";
  const idGen = createID(mask, false);
  const rx = /^[A-Z]\d-\d[A-Z]$/;

  for (let i = 0; i < 20; i++) {
    const r = idGen.random();
    assert.match(r, rx, `random() output "${r}" does not match ${rx}`);
  }
});

test("parse()", () => {
  const idGen = createID("X9-9X", false);

  const good = "a5-2d";
  const parsed = idGen.parse(good);
  assert.equal(parsed, "A5-2D");

  // wrong length
  assert.equal(idGen.parse("A5-2"), null);

  // invalid characters
  assert.equal(idGen.parse("!!-@@"), null);

  // mixed, but filter only letters+digits in order
  // should still reject because format must match
  assert.equal(idGen.parse("A5-23"), null);

  // parse numbers
  const idNum = createID("99-99", false);
  const parsedNum = idNum.parse(1234);
  assert.equal(parsedNum, "12-34");
});

test("With timestampPrefixDateOfStart", () => {
  const mask = "X9-9X";
  const idGen = createID(mask, false, new Date("2023-01-01T00:00:00Z"));

  const rnd = idGen.random();

  assert.equal(rnd.length, 10 + 1 + mask.length);
  assert.equal(idGen.parseTimestamp("AAA1017757-A4-8W").getTime(), new Date("2024-12-07T18:37:00.000Z").getTime());

  assert.equal(idGen.parse("AAA1017757A48W"), "AAA1017757-A4-8W");

  // invalids
  assert.equal(idGen.parse("B991017757-A4-8W"), null);
  assert.equal(idGen.parse("A991017757-04-8W"), null);

  /// Session ID

  const SessionId = createID(
    "XXX9-XXXX-XXXX-9XXX-X999-999X-999X-999X-9999-99XX",
    true,
    new Date("2023-01-01T00:00:00Z")
  );
  console.log(SessionId.parseTimestamp("AAA1217775-YLY4-WYMW-KALD-1KXL-N628-040T-092K-223R-4124-06AA"));
  assert.notEqual(SessionId.random(), null);
});
