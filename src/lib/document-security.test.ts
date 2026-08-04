import { describe, expect, it } from "vitest";
import { detectDocumentMime, safeDocumentFilename } from "./document-security";

describe("document security", () => {
  it("detects supported formats from their binary signature", () => {
    expect(detectDocumentMime(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(detectDocumentMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectDocumentMime(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it("removes path separators and control characters from download names", () => {
    expect(safeDocumentFilename("../../passaporto\n.pdf")).toBe(".._.._passaporto_.pdf");
    expect(safeDocumentFilename("\u0000/\\")).toBe("___");
  });
});
