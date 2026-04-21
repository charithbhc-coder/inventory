import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Creates a multer-s3 storage engine targeting the given sub-folder.
// Files land at: ktmg-vault-images/{folder}/{timestamp}-{random}.{ext}
// After upload, multer sets file.location to the full S3 HTTPS URL.
export function s3Storage(folder: string) {
  return multerS3({
    s3: s3Client,
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
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: key }),
    );
  } catch {
    // Silently ignore — file may not exist or URL may be a legacy local path
  }
}
