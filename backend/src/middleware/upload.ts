import multer, { StorageEngine, FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Request } from 'express';
import path from 'path';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'pharmacy-erp-files';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const generateUniqueFilename = (originalname: string): string => {
  const ext = path.extname(originalname).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
};

const createS3Storage = (folder: string): StorageEngine => {
  return multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req: Request, file: Express.Multer.File, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user?.userId || 'anonymous',
        originalName: file.originalname,
      });
    },
    key: (req: Request, file: Express.Multer.File, cb) => {
      const filename = generateUniqueFilename(file.originalname);
      cb(null, `${folder}/${filename}`);
    },
  });
};

const prescriptionFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed for prescriptions.'));
  }
};

const invoiceFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_DOCUMENT_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed for invoices.'));
  }
};

// Prescription image upload (max 5 images, 10MB each)
export const uploadPrescription = multer({
  storage: createS3Storage('prescriptions'),
  fileFilter: prescriptionFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
});

// Invoice document upload (max 1 file, 20MB)
export const uploadInvoice = multer({
  storage: createS3Storage('invoices'),
  fileFilter: invoiceFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1,
  },
});

// Purchase document upload (max 3 files, 20MB each)
export const uploadPurchaseDoc = multer({
  storage: createS3Storage('purchase-docs'),
  fileFilter: invoiceFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 3,
  },
});

// Profile picture upload
export const uploadProfilePicture = multer({
  storage: createS3Storage('profiles'),
  fileFilter: prescriptionFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

// Delete file from S3
export const deleteS3File = async (fileKey: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      })
    );
  } catch (error) {
    console.error(`[S3] Failed to delete file ${fileKey}:`, error);
    throw error;
  }
};

// Extract S3 key from URL
export const extractS3Key = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.pathname.substring(1); // Remove leading '/'
};

export { s3Client, BUCKET_NAME };
