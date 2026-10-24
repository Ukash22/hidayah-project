import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend1.onrender.com';
    if (url && !url.startsWith('http')) url = `https://${url}`;
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_BASE_URL = getBaseUrl();

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm', 'audio/flac',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_SIZE_BY_TYPE = { image: 15, video: 250, audio: 60, document: 30 };

function validateFile(file) {
    if (file.type && ALLOWED_MIME_TYPES.length > 0) {
        // If MIME is known, check against allowlist; allow if audio/video/image by prefix
        const isCommonMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.includes('pdf') || file.type.includes('officedocument') || file.type.includes('msword') || file.type.includes('excel') || file.type.includes('powerpoint');
        if (!ALLOWED_MIME_TYPES.includes(file.type) && !isCommonMedia) {
            console.warn(`File type "${file.type}" not in strict allowlist; proceeding with best effort.`);
        }
    }
    const category = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document';
    const maxMb = MAX_SIZE_BY_TYPE[category] || 50;
    if (file.size > maxMb * 1024 * 1024) {
        throw new Error(`File exceeds the ${maxMb}MB limit for ${category} uploads.`);
    }
}

/**
 * Uploads a file directly to Cloudinary using a signed signature from the backend.
 * Returns null gracefully if Cloudinary is not configured on the server.
 * @param {File} file - The file object to upload.
 * @param {string} folder - The destination folder in Cloudinary.
 * @returns {Promise<string|null>} - The secure URL of the uploaded file, or null if skipped.
 */
export const uploadToCloudinary = async (file, folder = 'tutor_media') => {
    if (!file) return null;
    try {
        validateFile(file);
    } catch (valErr) {
        console.warn('[Validation Warning]:', valErr.message);
        // Continue to attempt upload or return null
    }

    try {
        // 1. Get the signature from our Django backend
        const signatureResponse = await axios.get(`${API_BASE_URL}/api/tutors/cloudinary_signature/`, {
            params: { folder }
        });

        // Check if the backend returned an error object or configured === false
        if (signatureResponse.data?.error || signatureResponse.data?.configured === false) {
            console.warn('[Cloudinary] Cloudinary not configured on server. Falling back to direct backend upload.');
            return null;
        }

        const { signature, timestamp, api_key, cloud_name } = signatureResponse.data;

        // 2. Validate credentials — skip upload if backend .env is not configured
        if (!cloud_name || cloud_name === 'None' || !api_key || api_key === 'None' || !signature) {
            console.warn(`[Cloudinary] Incomplete credentials on server. Falling back to backend storage for: ${folder}`);
            return null;
        }

        // 3. Prepare the form data for Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('timestamp', timestamp);
        formData.append('api_key', api_key);
        formData.append('signature', signature);
        formData.append('folder', folder);

        // 4. Upload directly to Cloudinary
        const cloudinaryResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
            formData
        );

        return cloudinaryResponse.data.secure_url;
    } catch (error) {
        console.warn('Cloudinary upload skipped or failed, falling back to direct server upload:', error.message);
        return null;
    }
};

/**
 * Helper to upload multiple files sequentially.
 * Returns null URLs if uploads fail — registration continues regardless.
 * @param {Object} files - Dictionary of file objects { image: File, video: File, ... }
 * @param {Object} foldersMapped - Map of field name to folder name
 * @returns {Promise<Object>} - Dictionary of resulting URLs (null for failed/skipped)
 */
export const uploadMultipleToCloudinary = async (files, foldersMapped = {}) => {
    const fileEntries = Object.entries(files).filter(([, file]) => file !== null);

    // Map each file entry to an upload promise
    const uploadPromises = fileEntries.map(async ([key, file]) => {
        const folder = foldersMapped[key] || 'tutor_media';
        const url = await uploadToCloudinary(file, folder);
        return { key, url };
    });

    // Execute all uploads in parallel
    const results = await Promise.all(uploadPromises);

    // Reconstruct the urls object
    const urls = {};
    results.forEach(({ key, url }) => {
        urls[key] = url;
    });

    return urls;
};
/**
 * Enhances a Cloudinary URL with automatic optimization (q_auto, f_auto).
 * @param {string} url - The original Cloudinary secure URL.
 * @returns {string} - The optimized URL.
 */
export const optimizeCloudinaryUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    // Check if it's already optimized or has transformations
    if (url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    
    return url;
};
