import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { setupElectronMock } from './electronApiMock';
import App from "./App";
import { ToastProvider } from "./components/ui/use-toast";

// In a browser-based development environment (like for Playwright),
// mock the Electron-specific APIs before the app starts.
setupElectronMock();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
