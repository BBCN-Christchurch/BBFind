import { decode, encode } from "fast-png";
import jpeg from "jpeg-js";
const MAX_SIDE = 1200;
// Portable codecs only: no native Node addons, filesystem or paid transformations.
export async function processRaster(bytes: Uint8Array) {
  if (bytes.length < 45 || bytes.length > 6 * 1024 * 1024)
    throw new Error("Invalid image size.");
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((v, i) => bytes[i] === v))
    throw new Error("Upload could not be decoded as a PNG image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(8) !== 13 ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  )
    throw new Error("Invalid PNG header.");
  const width = view.getUint32(16),
    height = view.getUint32(20),
    channels = bytes[25] === 6 ? 4 : 3;
  if (
    width < 128 ||
    height < 128 ||
    width > MAX_SIDE ||
    height > MAX_SIDE ||
    width * height > MAX_SIDE * MAX_SIDE
  )
    throw new Error("Upload must be resized to 128–1200 pixels per side.");
  if (
    bytes[24] !== 8 ||
    ![2, 6].includes(bytes[25]) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    bytes[28] !== 0
  )
    throw new Error("Use a non-interlaced RGB or RGBA image.");
  let offset = 8,
    ended = false,
    count = 0;
  const critical: Uint8Array[] = [bytes.slice(0, 8)],
    compressed: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) {
    if (++count > 10000) throw new Error("Too many image chunks.");
    const size = view.getUint32(offset);
    if (size > bytes.length - offset - 12)
      throw new Error("Invalid PNG chunk.");
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type === "acTL") throw new Error("Animated images are not supported.");
    if (["IHDR", "IDAT", "IEND"].includes(type))
      critical.push(bytes.slice(offset, offset + size + 12));
    if (type === "IDAT")
      compressed.push(bytes.slice(offset + 8, offset + 8 + size));
    offset += size + 12;
    if (type === "IEND") {
      ended = true;
      break;
    }
  }
  if (!ended || offset !== bytes.length || !compressed.length)
    throw new Error("Incomplete image or unexpected trailing data.");
  // Bound decompression before passing the stream to the PNG decoder. Strip all
  // ancillary chunks first so compressed metadata cannot consume unbounded memory.
  const packed = concat(compressed);
  const reader = new Blob([packed.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  const expected = height * (1 + width * channels);
  let inflated = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      inflated += value.length;
      if (inflated > expected)
        throw new Error("Image decompression limit exceeded.");
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (inflated !== expected)
    throw new Error("Decoded image length did not match its dimensions.");
  const image = decode(concat(critical), { checkCrc: true });
  if (
    image.width !== width ||
    image.height !== height ||
    image.depth !== 8 ||
    ![3, 4].includes(image.channels)
  )
    throw new Error("Unsupported decoded image.");
  const pixels = new Uint8Array(width * height * 4);
  let transparent = false;
  for (let i = 0; i < width * height; i++) {
    const from = i * image.channels,
      to = i * 4;
    pixels[to] = image.data[from];
    pixels[to + 1] = image.data[from + 1];
    pixels[to + 2] = image.data[from + 2];
    pixels[to + 3] = image.channels === 4 ? image.data[from + 3] : 255;
    if (pixels[to + 3] < 255) transparent = true;
  }
  const variant = (max: number) => {
    const scale = Math.min(1, max / Math.max(width, height)),
      w = Math.round(width * scale),
      h = Math.round(height * scale);
    const data = resize(pixels, width, height, w, h);
    return transparent
      ? encode({ width: w, height: h, data, channels: 4, depth: 8 })
      : new Uint8Array(jpeg.encode({ width: w, height: h, data }, 82).data);
  };
  return {
    thumbnail: variant(320),
    detail: variant(800),
    large: variant(MAX_SIDE),
    width,
    height,
    format: transparent ? "png" : "jpg",
    mime: transparent ? "image/png" : "image/jpeg",
  };
}
function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let i = 0;
  for (const chunk of chunks) {
    out.set(chunk, i);
    i += chunk.length;
  }
  return out;
}
// Bilinear sampling in premultiplied alpha avoids dark fringes around logos.
function resize(
  source: Uint8Array,
  width: number,
  height: number,
  w: number,
  h: number,
) {
  if (w === width && h === height) return source;
  const output = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, ((x + 0.5) * width) / w - 0.5),
        sy = Math.max(0, ((y + 0.5) * height) / h - 0.5),
        x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        x1 = Math.min(width - 1, x0 + 1),
        y1 = Math.min(height - 1, y0 + 1),
        dx = sx - x0,
        dy = sy - y0;
      const indices = [
          (y0 * width + x0) * 4,
          (y0 * width + x1) * 4,
          (y1 * width + x0) * 4,
          (y1 * width + x1) * 4,
        ],
        weights = [(1 - dx) * (1 - dy), dx * (1 - dy), (1 - dx) * dy, dx * dy];
      let alpha = 0,
        r = 0,
        g = 0,
        b = 0;
      for (let k = 0; k < 4; k++) {
        const i = indices[k],
          a = source[i + 3] * weights[k];
        alpha += a;
        r += source[i] * a;
        g += source[i + 1] * a;
        b += source[i + 2] * a;
      }
      const out = (y * w + x) * 4;
      output[out] = alpha ? Math.round(r / alpha) : 0;
      output[out + 1] = alpha ? Math.round(g / alpha) : 0;
      output[out + 2] = alpha ? Math.round(b / alpha) : 0;
      output[out + 3] = Math.round(alpha);
    }
  return output;
}
