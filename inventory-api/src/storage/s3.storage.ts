import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';
import * as multer from 'multer';
import * as dotenv from 'dotenv';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
}

export function getS3Url(key: string): string {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Memory storage for endpoints that compress before uploading.
export const memoryStorage = multer.memoryStorage();

// Compress an image buffer with sharp and upload to S3. Returns the public URL.
// Non-image files (PDF, etc.) are passed through without compression.
export async function uploadCompressedToS3(
  buffer: Buffer,
  originalName: string,
  folder: string,
  maxWidth = 1200,
  quality = 82,
): Promise<string> {
  const ext = extname(originalName).toLowerCase();
  const key = `ktmg-vault-images/${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  let processedBuffer: Buffer;
  let contentType: string;

  if (['.jpg', '.jpeg'].includes(ext)) {
    processedBuffer = await sharp(buffer)
      .resize(maxWidth, undefined, { withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    contentType = 'image/jpeg';
  } else if (ext === '.png') {
    processedBuffer = await sharp(buffer)
      .resize(maxWidth, undefined, { withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer();
    contentType = 'image/png';
  } else if (ext === '.webp') {
    processedBuffer = await sharp(buffer)
      .resize(maxWidth, undefined, { withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    contentType = 'image/webp';
  } else {
    processedBuffer = buffer;
    contentType = 'application/octet-stream';
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: processedBuffer,
      ContentType: contentType,
    }),
  );

  return getS3Url(key);
}

// Creates a multer-s3 storage engine targeting the given sub-folder.
// Files land at: ktmg-vault-images/{folder}/{timestamp}-{random}.{ext}
// After upload, multer sets file.location to the full S3 HTTPS URL.
export function s3Storage(folder: string) {
  return multerS3({
    s3: getS3Client(),
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: any, file: any, cb: any) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `ktmg-vault-images/${folder}/${suffix}${ext}`);
    },
  });
}

// Deletes a file from S3 by its full URL. Best-effort — never throws.
export async function deleteFromS3(url: string): Promise<void> {
  try {
    if (!url || !url.startsWith('http')) return;
    const urlObj = new URL(url);
    const key = urlObj.pathname.replace(/^\//, '');
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: key }),
    );
  } catch {
    // Silently ignore — file may not exist or URL may be a legacy local path
  }
}
