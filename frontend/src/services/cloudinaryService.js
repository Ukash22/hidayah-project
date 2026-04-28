import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
    if (url && !url.startsWith('http')) url = `https://${url}`;
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_BASE_URL = getBaseUrl();

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
        // 1. Get the signature from our Django backend
        const signatureResponse = await axios.get(`${API_BASE_URL}/api/tutors/cloudinary_signature/`, {
            params: { folder }
        });

        const { signature, timestamp, api_key, cloud_name } = signatureResponse.data;

        // 2. Validate credentials — skip upload if backend .env is not configured
        if (!cloud_name || cloud_name === 'None' || !api_key || api_key === 'None') {
            console.warn(`[Cloudinary] Credentials not configured on server. Skipping upload for folder: ${folder}`);
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
        // Note: Do NOT set Content-Type header manually; axios/browser will set it with the correct boundary
        const cloudinaryResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
            formData
        );

        return cloudinaryResponse.data.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error Details:', {
            message: error.message,
            response: error.response?.data,
            config: error.config
        });
        let detail = '';
        if (error.response?.data?.error?.message) {
            detail = `: ${error.response.data.error.message}`;
        } else if (error.message) {
            detail = `: ${error.message}`;
        }
        throw new Error(`File upload failed${detail}. Please check your credentials and connection.`);
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
    const urls = {};
    const fileEntries = Object.entries(files).filter(([, file]) => file !== null);

    for (const [key, file] of fileEntries) {
        const folder = foldersMapped[key] || 'tutor_media';
        urls[key] = await uploadToCloudinary(file, folder);
    }

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
