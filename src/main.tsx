import { MotionGlobalConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { missingConfig } from "./api";
import App from "./App";
import { registerServiceWorker } from "./lib/push";
import "./styles.css";

// ?still: saltea las animaciones (solo para sacar capturas de pantalla estables).
if (new URLSearchParams(location.search).has("still")) MotionGlobalConfig.skipAnimations = true;

function ConfigMissing() {
  return (
    <main className="config-missing">
      <h1>Falta configurar Supabase</h1>
      <p>
        Cargá <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (en Vercel: Settings, Environment Variables) y volvé a
        desplegar.
      </p>
    </main>
  );
}

registerServiceWorker();
createRoot(document.getElementById("root")!).render(<StrictMode>{missingConfig ? <ConfigMissing /> : <App />}</StrictMode>);
