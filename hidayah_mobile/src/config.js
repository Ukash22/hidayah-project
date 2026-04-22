/**
 * Hidayah Mobile Configuration
 * Centered environment variables and feature flags.
 */

const CONFIG = {
    // API CONFIGURATION
    // For Android Emulator, use 10.0.2.2
    // For iOS Simulator, use localhost
    // For physical device, use your machine's local IP (e.g., 192.168.1.50)
    API_BASE_URL: 'http://192.168.212.35:8000',
    
    // CLOUDINARY CONFIGURATION
    CLOUDINARY_CLOUD_NAME: 'dg926f6p6',
    CLOUDINARY_UPLOAD_PRESET: 'hidayah_preset',
    
    // FEATURE FLAGS
    ENABLE_ANALYTICS: false,
    IS_PRODUCTION: false,
};

export default CONFIG;
