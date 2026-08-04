export const MAX_DOCUMENT_BYTES = 4_000_000;

export const documentMimeExtensions = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedDocumentMime = keyof typeof documentMimeExtensions;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[index + offset] === byte);
}

export function detectDocumentMime(bytes: Uint8Array): AllowedDocumentMime | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export function safeDocumentFilename(value: string) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f/\\]/g, "_").trim().slice(0, 120);
  return cleaned || "documento";
}
