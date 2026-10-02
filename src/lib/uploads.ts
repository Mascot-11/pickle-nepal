/**
 * Upload handling (REQUIREMENT.md §64).
 *
 * Two backends: S3-compatible object storage (Cloudflare R2 / S3) when
 * configured, otherwise local disk under `UPLOAD_DIR`. Validation happens
 * before any bytes are stored.
 */

import "server-only";
import path from "node:path";
import { randomToken } from "@/lib/slug";
import { storeObject } from "@/lib/storage";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_UPLOAD_BYTES = () => {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "5");
  return (Number.isFinite(mb) && mb > 0 ? mb : 5) * 1024 * 1024;
};

export const MAX_IMAGE_DIMENSION = 4000;

export type UploadResult = {
  url: string;
  key: string;
  size: number;
};

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Magic-number sniffing so a renamed `.exe` cannot pass as an image. */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    buffer.subarray(8, 12).toString("ascii").startsWith("avif")
  ) {
    return "image/avif";
  }
  return null;
}

export function validateImageUpload(
  buffer: Buffer,
  declaredType: string | undefined,
  declaredName: string,
): { mimeType: string; extension: string } {
  const maxBytes = MAX_UPLOAD_BYTES();
  if (buffer.length === 0) throw new UploadValidationError("The file is empty.");
  if (buffer.length > maxBytes) {
    throw new UploadValidationError(
      `Images must be smaller than ${Math.round(maxBytes / 1024 / 1024)}MB.`,
    );
  }

  const sniffed = sniffImageType(buffer);
  if (!sniffed) {
    throw new UploadValidationError("Only JPEG, PNG, WebP or AVIF images are allowed.");
  }
  if (declaredType && !ALLOWED_IMAGE_TYPES.includes(declaredType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new UploadValidationError("That image type is not allowed.");
  }

  const extension = path.extname(declaredName).toLowerCase();
  const expected: Record<string, string[]> = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/avif": [".avif"],
  };
  if (extension && !expected[sniffed].includes(extension)) {
    throw new UploadValidationError("The file extension does not match the image content.");
  }

  return { mimeType: sniffed, extension: expected[sniffed][0] };
}

export async function storeImage(
  buffer: Buffer,
  options: { declaredType?: string; declaredName?: string; folder?: string } = {},
): Promise<UploadResult> {
  const declaredName = options.declaredName ?? "upload.png";
  const { mimeType, extension } = validateImageUpload(buffer, options.declaredType, declaredName);

  const folder = (options.folder ?? "general").replace(/[^a-z0-9/_-]/gi, "");
  const key = `${folder}/${randomToken(12)}${extension}`;

  return storeObject(key, buffer, mimeType);
}