import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { autoEnableSupabasePersistence } from "@/lib/oracle/persistence";

// Lazily swap the snapshot store to Supabase if env vars are configured.
// On the demo path the call no-ops and the LocalStorage store stays active.
void autoEnableSupabasePersistence();

createRoot(document.getElementById("root")!).render(<App />);
