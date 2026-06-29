// API Configuration
// VITE_API_URL is set as a build-time environment variable on Render.com
// For local development, falls back to localhost:3000
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
