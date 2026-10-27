// @vitest-environment node
import { describe, it, expect } from "vitest";
import { Image } from "imagescript";
import { readImageForm } from "../supabase/functions/_shared/limits";
import { processRaster } from "../supabase/functions/_shared/process";
describe("trusted raster processor", () => {
  it("creates bounded variants and rejects invalid input", async () => {
    const input = new Image(1200, 800).fill(0x7c9a66ff);
    const encoded = await input.encode();
    const start = performance.now();
    const result = await processRaster(encoded);
    console.info(
      "1200×800 image processing:",
      Math.round(performance.now() - start),
      "ms",
    );
    expect((await Image.decode(result.thumbnail)).width).toBe(320);
    expect((await Image.decode(result.detail)).width).toBe(800);
    expect((await Image.decode(result.large)).width).toBe(1200);
    await expect(
      processRaster(new TextEncoder().encode("<svg>bad</svg>")),
    ).rejects.toThrow();
    const malicious = encoded.slice();
    new DataView(malicious.buffer).setUint32(16, 100000);
    await expect(processRaster(malicious)).rejects.toThrow("resized");
  }, 15000);
  it("removes private source metadata from transparent PNG variants", async () => {
    const source = await new Image(256, 256).fill(0x66aa6680).encode(1, {
      author: "PRIVATE REGISTRATION CONTACT",
      comment: "PRIVATE GPS INFORMATION",
    });
    expect(Buffer.from(source).includes(Buffer.from("PRIVATE"))).toBe(true);
    const result = await processRaster(source);
    expect(result.format).toBe("png");
    for (const variant of [result.thumbnail, result.detail, result.large]) {
      expect(Buffer.from(variant).includes(Buffer.from("PRIVATE"))).toBe(false);
      expect(Buffer.from(variant).includes(Buffer.from("tEXt"))).toBe(false);
      expect((await Image.decode(variant)).width).toBe(256);
    }
  });
  it("rejects oversized files and extra appended content", async () => {
    await expect(
      processRaster(new Uint8Array(7 * 1024 * 1024)),
    ).rejects.toThrow("size");
    const bytes = await new Image(128, 128).fill(0xff0000ff).encode();
    const appended = new Uint8Array(bytes.length + 4);
    appended.set(bytes);
    await expect(processRaster(appended)).rejects.toThrow("trailing");
  });
});

describe("multipart upload limits", () => {
  it("rejects oversized bodies even without Content-Length", async () => {
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: new Blob([new Uint8Array(20)]),
    });
    expect(request.headers.has("Content-Length")).toBe(false);
    await expect(readImageForm(request, 10)).rejects.toThrow(
      "Upload too large",
    );
  });
  it("preserves a bounded multipart upload", async () => {
    const form = new FormData();
    form.append("alt", "A community photo");
    form.append("file", new Blob([new Uint8Array([1, 2, 3])]), "image.png");
    const parsed = await readImageForm(
      new Request("http://localhost/upload", { method: "POST", body: form }),
      4096,
    );
    expect(parsed.get("alt")).toBe("A community photo");
    expect((parsed.get("file") as File).size).toBe(3);
  });
});
