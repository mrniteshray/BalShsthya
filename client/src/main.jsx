import "./node-shims.js";
import { Buffer } from "buffer";
window.Buffer = Buffer;

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "./routes/routes.jsx";
import { Provider } from 'react-redux';
import { store } from './store/store.jsx';
import MagicCursorTrail from "./components/magiccursortrail.jsx"
import Loader from "./components/Loader.jsx";

// Runtime diagnostics
window.onerror = (msg, url, line, col, error) => {
  console.log(`[DEBUG] main.jsx Window Error: ${msg} at ${line}:${col}`);
};
window.onunhandledrejection = (event) => {
  console.log('[DEBUG] main.jsx Unhandled Rejection:', event.reason);
};
console.log('[DEBUG] main.jsx script start');

// Ensure initial theme is applied before React mounts to avoid flashes
(function applyInitialTheme() {
  try {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {
    // no-op
  }
})();

// Development helper: Reset loader for testing
if (import.meta.env.DEV) {
  window.resetLoader = () => {
    window.location.reload();
  };
}

const AppWithLoader = () => {
  const [showLoader, setShowLoader] = useState(true);

  const handleLoaderComplete = () => {
    console.log("Loader completed. Rendering main app.");
    setShowLoader(false);
  };

  if (showLoader) {
    console.log("Rendering Loader component.");
    return <Loader onComplete={handleLoaderComplete} />;
  }

  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

try {
  console.log('[DEBUG] Attempting to mount React app...');
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.log('[DEBUG] ERROR: #root element not found!');
  } else {
    createRoot(rootElement).render(<AppWithLoader />);
    console.log('[DEBUG] Render call finished.');
  }
} catch (error) {
  console.log('[DEBUG] CRITICAL MOUNT ERROR:', error);
}

