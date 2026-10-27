// Bound the complete multipart body, including uploads without Content-Length.
export async function readImageForm(
  request: Request,
  maximum = 7 * 1024 * 1024,
) {
  if (!request.body) throw new Error("An image upload is required.");
  const reader = request.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) throw new Error("Upload too large.");
      chunks.push(new Uint8Array(value).buffer);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return new Response(new Blob(chunks), {
    headers: { "Content-Type": request.headers.get("Content-Type") || "" },
  }).formData();
}
