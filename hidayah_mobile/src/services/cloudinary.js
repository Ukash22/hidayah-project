import axios from 'axios';
import axiosInstance from '../api/axios'; // Use our pre-configured instance for auth

/**
 * Uploads a file directly to Cloudinary using a signed signature from the backend.
 * Dedicated for React Native (handled via FormData with URI).
 * 
 * @param {Object} file - The file object from picker { uri, name, type }
 * @param {string} folder - The destination folder in Cloudinary.
 * @returns {Promise<string|null>} - The secure URL of the uploaded file.
 */
export const uploadToCloudinary = async (file, folder = 'tutor_media') => {
    if (!file || !file.uri) return null;

    try {
        // 1. Get the signature from our Django backend
        // We use axiosInstance to ensure we have the auth token for this restricted endpoint
        const signatureResponse = await axiosInstance.get('/api/tutors/cloudinary_signature/', {
            params: { folder }
        });

        const { signature, timestamp, api_key, cloud_name } = signatureResponse.data;

        if (!cloud_name || cloud_name === 'None') {
            console.warn(`[Cloudinary] Credentials not configured on server. Skipping upload.`);
            return null;
        }

        // 2. Prepare the form data for Cloudinary (React Native specific)
        const formData = new FormData();
        
        // In React Native, the 'file' field must be an object with uri, type, and name
        formData.append('file', {
            uri: file.uri,
            type: file.type || 'image/jpeg', // Fallback for simple images
            name: file.name || 'upload.jpg'
        });
        
        formData.append('timestamp', timestamp);
        formData.append('api_key', api_key);
        formData.append('signature', signature);
        formData.append('folder', folder);

        // 3. Upload directly to Cloudinary
        // Note: We use raw axios here, not our instance, because this goes to Cloudinary's API
        const cloudinaryResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Optional: Monitor progress
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`[Cloudinary] Upload progress: ${percentCompleted}%`);
                }
            }
        );

        return cloudinaryResponse.data.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error.response?.data || error.message);
        throw new Error(`File upload failed: ${error.message}`);
    }
};

/**
 * Helper to upload multiple files.
 */
export const uploadMultipleToCloudinary = async (files, foldersMapped = {}) => {
    const urls = {};
    const fileEntries = Object.entries(files).filter(([_, file]) => file !== null);

    for (const [key, file] of fileEntries) {
        const folder = foldersMapped[key] || 'tutor_media';
        urls[key] = await uploadToCloudinary(file, folder);
    }

    return urls;
};
