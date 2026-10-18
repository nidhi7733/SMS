import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface StorageDriver {
  upload(buffer: Buffer, originalName: string, mimeType: string, folder: string): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// 1. Local Disk Storage Provider (Default for Offline / Local Dev)
// ---------------------------------------------------------------------------
export class LocalDiskStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string, folder: string = 'general'): Promise<UploadResult> {
    const targetFolder = path.join(this.baseDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const ext = path.extname(originalName).toLowerCase() || this.getDefaultExt(mimeType);
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filename = `${sanitizedBase}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetFolder, filename);

    await fs.promises.writeFile(filePath, buffer);

    const key = `${folder}/${filename}`;
    // URL accessible via static route /uploads/
    const url = `/uploads/${folder}/${filename}`;

    return {
      url,
      key,
      size: buffer.length,
      mimeType,
      originalName,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const sanitizedKey = key.replace(/^\/+/, '').replace(/^uploads\//, '');
      const filePath = path.join(this.baseDir, sanitizedKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Storage] Error deleting local file:', err);
      return false;
    }
  }

  private getDefaultExt(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      case 'image/gif':
        return '.gif';
      case 'application/pdf':
        return '.pdf';
      default:
        return '.bin';
    }
  }
}

// ---------------------------------------------------------------------------
// 2. S3-Compatible Storage Provider (Cloudflare R2, AWS S3, MinIO)
// ---------------------------------------------------------------------------
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || 'sms-assets';
    this.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string, folder: string = 'general'): Promise<UploadResult> {
    const ext = path.extname(originalName).toLowerCase();
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filename = `${sanitizedBase}-${uniqueSuffix}${ext}`;
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    // Compute public URL
    let url = '';
    if (this.publicBaseUrl) {
      url = `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    } else if (process.env.S3_ENDPOINT) {
      url = `${process.env.S3_ENDPOINT.replace(/\/+$/, '')}/${this.bucket}/${key}`;
    } else {
      url = `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }

    return {
      url,
      key,
      size: buffer.length,
      mimeType,
      originalName,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const sanitizedKey = key.replace(/^\/+/, '');
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: sanitizedKey,
        })
      );
      return true;
    } catch (err) {
      console.error('[Storage] Error deleting S3 object:', err);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Storage Service Singleton / Factory
// ---------------------------------------------------------------------------
let storageInstance: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (!storageInstance) {
    const driverType = (process.env.STORAGE_DRIVER || 'local').toLowerCase().trim();
    if (driverType === 's3' || driverType === 'r2' || driverType === 'minio') {
      console.log('[Storage] Initializing S3-Compatible Cloud Storage driver (R2/S3/MinIO)...');
      storageInstance = new S3StorageDriver();
    } else {
      console.log('[Storage] Initializing Local Disk Storage driver (/uploads)...');
      storageInstance = new LocalDiskStorageDriver();
    }
  }
  return storageInstance;
}
