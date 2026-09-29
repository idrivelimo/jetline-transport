import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkLogo, MAX_LOGO_BYTES } from "./logo.ts";

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];

const dataUrl = (type: string, bytes: number[]) =>
  `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

describe("checkLogo", () => {
  it("treats an empty field as no logo", () => {
    assert.deepEqual(checkLogo(""), { ok: true, logo: null });
    assert.deepEqual(checkLogo("   "), { ok: true, logo: null });
  });

  it("accepts a PNG and a JPEG whose bytes match their type", () => {
    const png = dataUrl("image/png", PNG_HEAD);
    const jpeg = dataUrl("image/jpeg", JPEG_HEAD);
    assert.deepEqual(checkLogo(png), { ok: true, logo: png });
    assert.deepEqual(checkLogo(jpeg), { ok: true, logo: jpeg });
  });

  it("rejects a type the PDF can't draw", () => {
    assert.equal(checkLogo(dataUrl("image/svg+xml", [0x3c, 0x73, 0x76, 0x67])).ok, false);
    assert.equal(checkLogo(dataUrl("image/webp", PNG_HEAD)).ok, false);
  });

  it("rejects bytes that don't match the claimed type", () => {
    assert.equal(checkLogo(dataUrl("image/png", JPEG_HEAD)).ok, false);
    assert.equal(checkLogo(dataUrl("image/jpeg", PNG_HEAD)).ok, false);
  });

  it("rejects anything that isn't a base64 data URL", () => {
    assert.equal(checkLogo("https://example.com/logo.png").ok, false);
    assert.equal(checkLogo("data:image/png;base64,not base64!").ok, false);
  });

  it("rejects a logo over the size cap", () => {
    const big = [...PNG_HEAD, ...new Array(MAX_LOGO_BYTES).fill(0)];
    assert.equal(checkLogo(dataUrl("image/png", big)).ok, false);
  });
});
