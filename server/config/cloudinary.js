import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'socketsupport/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 256, height: 256, crop: 'fill' }],
    },
});

export const upload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const attachmentStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        // Automatically determine format based on mimetype or fallback to 'raw'
        // For documents like pdf, Cloudinary requires 'raw' resource_type unless specified otherwise
        return {
            folder: 'socketsupport/attachments',
            resource_type: 'auto',
        };
    },
});

export const uploadAttachment = multer({
    storage: attachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});