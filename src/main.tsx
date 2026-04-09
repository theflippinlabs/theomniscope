import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { autoEnableSupabasePersistence } from "@/lib/oracle/persistence";
import { installHttpProviders } from "@/lib/providers";

// Swap the default CommandBrain registry to a hybrid HTTP + mock
// fallback. The hybrid registry never throws: when no API key is set
// or an upstream call fails, it transparently falls back to the mock
// layer so the demo path continues to work unchanged.
installHttpProviders();

// Lazily swap the snapshot store to Supabase if env vars are configured.
// On the demo path the call no-ops and the LocalStorage store stays active.
void autoEnableSupabasePersistence();

createRoot(document.getElementById("root")!).render(<App />);
