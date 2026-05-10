import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// ── SUPPRESS TLDRAW LICENSE WARNINGS ────────────────────────────────────────
const suppress = (method) => {
    const original = console[method];
    console[method] = (...args) => {
        if (args[0] && typeof args[0] === 'string') {
            const msg = args[0].toLowerCase();
            if (msg.includes('tldraw') || msg.includes('sales@tldraw.com') || msg.includes('license') || msg.includes('----')) return;
        }
        original.apply(console, args);
    };
};
['log', 'warn', 'error', 'debug'].forEach(suppress);


// ── GLOBAL API CONFIGURATION ────────────────────────────────────────────────
// This interceptor fixes cases where the API URL is incorrectly constructed
// as a relative path, which happens if VITE_API_BASE_URL is missing the protocol.
axios.interceptors.request.use(config => {
    if (config.url && !config.url.startsWith('http')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
        const absoluteBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        const cleanBaseUrl = absoluteBaseUrl.endsWith('/') ? absoluteBaseUrl.slice(0, -1) : absoluteBaseUrl;
        
        // If the URL already contains the domain name but lacks the protocol
        if (config.url.includes('hidayah-backend-zgix.onrender.com')) {
            config.url = `https://${config.url.replace(/^\/+/, '')}`;
        } else {
            // It's a purely relative path like "/api/auth/login"
            const path = config.url.startsWith('/') ? config.url : `/${config.url}`;
            config.url = `${cleanBaseUrl}${path}`;
        }
    }
    return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
