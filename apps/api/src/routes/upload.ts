import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getStorageDriver } from '../services/storage.js';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOC_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export async function uploadRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------------
  // 1. POST /api/upload/image (Image Upload Endpoint)
  // -------------------------------------------------------------------------
  fastify.post('/image', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file({
        limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      });

      if (!data) {
        return reply.status(400).send({ message: 'No image file was provided for upload.' });
      }

      if (!ALLOWED_IMAGE_MIMES.has(data.mimetype)) {
        return reply.status(400).send({
          message: `Invalid file type '${data.mimetype}'. Only JPEG, PNG, WebP, SVG, and GIF images are allowed.`,
        });
      }

      const buffer = await data.toBuffer();
      if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        return reply.status(400).send({
          message: 'Image size exceeds maximum limit of 5MB.',
        });
      }

      // Check folder field from multipart fields if present
      const folderField = (data.fields as any)?.folder;
      const folderVal = folderField && typeof folderField.value === 'string'
        ? folderField.value.trim().toLowerCase()
        : 'website';
      const sanitizedFolder = folderVal.replace(/[^a-z0-9_-]/g, '') || 'website';

      const storage = getStorageDriver();
      const result = await storage.upload(buffer, data.filename, data.mimetype, sanitizedFolder);

      return reply.status(201).send({
        success: true,
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        originalName: result.originalName,
      });
    } catch (err: any) {
      request.log.error(err, '[Upload] Image upload error:');
      return reply.status(500).send({
        message: err.message || 'Failed to process and upload image.',
      });
    }
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/upload/document (Document / PDF Upload Endpoint)
  // -------------------------------------------------------------------------
  fastify.post('/document', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file({
        limits: { fileSize: MAX_DOC_SIZE_BYTES },
      });

      if (!data) {
        return reply.status(400).send({ message: 'No document file was provided for upload.' });
      }

      if (!ALLOWED_DOCUMENT_MIMES.has(data.mimetype)) {
        return reply.status(400).send({
          message: `Invalid file format '${data.mimetype}'. Only PDF, Word, Excel, CSV, and image documents are allowed.`,
        });
      }

      const buffer = await data.toBuffer();
      if (buffer.length > MAX_DOC_SIZE_BYTES) {
        return reply.status(400).send({
          message: 'Document size exceeds maximum limit of 15MB.',
        });
      }

      const folderField = (data.fields as any)?.folder;
      const folderVal = folderField && typeof folderField.value === 'string'
        ? folderField.value.trim().toLowerCase()
        : 'documents';
      const sanitizedFolder = folderVal.replace(/[^a-z0-9_-]/g, '') || 'documents';

      const storage = getStorageDriver();
      const result = await storage.upload(buffer, data.filename, data.mimetype, sanitizedFolder);

      return reply.status(201).send({
        success: true,
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        originalName: result.originalName,
      });
    } catch (err: any) {
      request.log.error(err, '[Upload] Document upload error:');
      return reply.status(500).send({
        message: err.message || 'Failed to process and upload document.',
      });
    }
  });

  // -------------------------------------------------------------------------
  // 3. DELETE /api/upload (Delete File from Storage)
  // -------------------------------------------------------------------------
  fastify.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bodyKey = (request.body as any)?.key;
      const queryKey = (request.query as any)?.key;
      const key = bodyKey || queryKey;
      if (!key || typeof key !== 'string') {
        return reply.status(400).send({ message: 'File key is required to delete.' });
      }

      const storage = getStorageDriver();
      const deleted = await storage.delete(key);

      return reply.send({ success: deleted });
    } catch (err: any) {
      request.log.error(err, '[Upload] Delete error:');
      return reply.status(500).send({ message: 'Failed to delete file from storage.' });
    }
  });
}

export default uploadRoutes;
