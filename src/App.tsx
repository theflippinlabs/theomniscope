import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { initAuthListener } from "@/lib/store/useAuthStore";
import InvitationGate from "@/components/InvitationGate";

// Oracle Sentinel — public surface
import OracleLanding from "@/pages/oracle/OracleLanding";
import OracleMethodology from "@/pages/oracle/OracleMethodology";
import OracleSecurity from "@/pages/oracle/OracleSecurity";
import OracleTransparency from "@/pages/oracle/OracleTransparency";
import OracleLegal from "@/pages/oracle/OracleLegal";
import Login from "@/pages/auth/Login";
import CommandCenter from "@/pages/CommandCenter";

// Oracle Sentinel — command center surface
import { OracleAppShell } from "@/components/oracle/OracleAppShell";
import OracleCommand from "@/pages/oracle/OracleCommand";
import OracleWalletAnalyzer from "@/pages/oracle/OracleWalletAnalyzer";
import OracleTokenAnalyzer from "@/pages/oracle/OracleTokenAnalyzer";
import OracleNFTMonitor from "@/pages/oracle/OracleNFTMonitor";
import OracleSignals from "@/pages/oracle/OracleSignals";
import OracleInvestigations from "@/pages/oracle/OracleInvestigations";
import OracleReports from "@/pages/oracle/OracleReports";
import OracleAlerts from "@/pages/oracle/OracleAlerts";
import OracleHistory from "@/pages/oracle/OracleHistory";
import OracleSettings from "@/pages/oracle/OracleSettings";
import OracleAnalyze from "@/pages/oracle/OracleAnalyze";
import OracleForensic from "@/pages/oracle/OracleForensic";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const [hasAccess, setHasAccess] = useState(false);

  // Subscribe to Supabase auth state once for the whole app.
  useEffect(() => initAuthListener(), []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages — accessible without invitation */}
        <Route path="/methodology" element={<OracleMethodology />} />
        <Route path="/security" element={<OracleSecurity />} />
        <Route path="/transparency" element={<OracleTransparency />} />
        <Route path="/legal" element={<OracleLegal />} />
        <Route path="/login" element={<Login />} />

        {/* Everything else goes through InvitationGate first */}
        <Route
          path="*"
          element={
            !hasAccess ? (
              <InvitationGate onGranted={() => setHasAccess(true)} />
            ) : (
              <AuthenticatedRoutes />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Routes available AFTER InvitationGate grants access.
 * The OracleAppShell provides the sidebar (desktop) and
 * bottom nav bar (mobile).
 */
function AuthenticatedRoutes() {
  return (
    <Routes>
      {/* Main app inside the Oracle shell with nav bar */}
      <Route element={<OracleAppShell />}>
        <Route path="/" element={<OracleCommand />} />
        <Route path="/app" element={<OracleCommand />} />
        <Route path="/app/command" element={<OracleCommand />} />
        <Route path="/app/analyze" element={<OracleAnalyze />} />
        <Route path="/app/wallet" element={<OracleWalletAnalyzer />} />
        <Route path="/app/token" element={<OracleTokenAnalyzer />} />
        <Route path="/app/nft" element={<OracleNFTMonitor />} />
        <Route path="/app/signals" element={<OracleSignals />} />
        <Route path="/app/investigations" element={<OracleInvestigations />} />
        <Route path="/app/reports" element={<OracleReports />} />
        <Route path="/app/alerts" element={<OracleAlerts />} />
        <Route path="/app/forensic" element={<OracleForensic />} />
        <Route path="/app/history" element={<OracleHistory />} />
        <Route path="/app/settings" element={<OracleSettings />} />
        <Route path="/dashboard" element={<CommandCenter />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
