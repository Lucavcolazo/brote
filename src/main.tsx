import { MotionGlobalConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./lib/push";
import "./styles.css";

// ?still: saltea las animaciones (solo para sacar capturas de pantalla estables).
if (new URLSearchParams(location.search).has("still")) MotionGlobalConfig.skipAnimations = true;

registerServiceWorker();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
