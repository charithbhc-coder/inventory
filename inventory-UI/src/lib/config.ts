/**
 * Production-ready configuration for the Inventory UI.
 * All base URLs and system-level constants should be defined here.
 */

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/inventory-api/v1';

// The root URL for the API for static file serving (matches the API base)
export const API_ROOT_URL = VITE_API_BASE_URL;

// The full base URL for API requests
export const API_BASE_URL = VITE_API_BASE_URL;

// Helper to get full URL for uploads
export const getUploadUrl = (path: string) => path ? `${API_ROOT_URL}${path}` : '';

// Generic system branding if needed on frontend
export const SYSTEM_NAME = 'Inventory';
