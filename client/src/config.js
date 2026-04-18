const CONFIG = {
    // 1. FOR LOCAL TESTING: Update the IP address to your machine's local IP if testing across devices.
    // 2. FOR PRODUCTION/REMOTE: Set VITE_BACKEND_URL environment variable in your hosting provider (e.g., Vercel)
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://10.60.100.50:5000",
    FRONTEND_URL: window.location.origin
};

export default CONFIG;
