/**
 * Storage backend for uploads (REQUIREMENT.md §64).
 *
 * S3-compatible object storage (Cloudflare R2 / AWS S3 / MinIO) when R2_*
 * variables are set; otherwise the local filesystem. Swapping the backend is
 * the only change needed to move from local dev to production object storage.
 */

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export type StoredObject = {
  url: string;
  key: string;
  size: number;
  backend: "s3" | "disk";
};

export function objectStorageConfigured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

let s3ClientPromise: Promise<unknown> | null = null;

async function getS3Client(): Promise<{
  PutObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> };
  send: (command: unknown) => Promise<unknown>;
}> {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = await import("@aws-sdk/client-s3");
      return new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
    })();
  }
  return (await s3ClientPromise) as never;
}

async function putToObjectStorage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }) as never,
  );

  const publicUrl =
    process.env.R2_PUBLIC_URL ??
    `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;

  return { url: `${publicUrl}/${key}`, key, size: body.length, backend: "s3" };
}

async function putToLocalDisk(key: string, body: Buffer): Promise<StoredObject> {
  const baseDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./public/uploads");
  const target = path.join(baseDir, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
  return { url: `/uploads/${key}`, key, size: body.length, backend: "disk" };
}

export async function storeObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  if (objectStorageConfigured()) {
    return putToObjectStorage(key, body, contentType);
  }
  return putToLocalDisk(key, body);
}