import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { initAuthListener, useAuthStore } from "@/lib/store/useAuthStore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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

/**
 * Smart home route: authenticated users (or users with an invitation
 * code) go straight to /app. Everyone else sees the landing page.
 */
function SmartHome() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  // Check invitation gate (same logic as ProtectedRoute)
  const hasInvitation = (() => {
    try {
      return Boolean(localStorage.getItem("oracle_device_id"));
    } catch {
      return false;
    }
  })();

  if (loading) return <OracleLanding />;
  if (session || hasInvitation) return <Navigate to="/app" replace />;
  return <OracleLanding />;
}

function AppContent() {
  // Subscribe to Supabase auth state once for the whole app.
  useEffect(() => initAuthListener(), []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Smart home — redirects logged-in users to /app */}
        <Route path="/" element={<SmartHome />} />
        <Route path="/methodology" element={<OracleMethodology />} />
        <Route path="/security" element={<OracleSecurity />} />
        <Route path="/transparency" element={<OracleTransparency />} />
        <Route path="/legal" element={<OracleLegal />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard surface — top-level /dashboard route wrapped
            in the shared OracleAppShell, hosting the orphaned
            CommandCenter widget grid. */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OracleAppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<CommandCenter />} />
        </Route>

        {/* Oracle Sentinel command surface — requires a Supabase session */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <OracleAppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<OracleCommand />} />
          <Route path="command" element={<OracleCommand />} />
          <Route path="analyze" element={<OracleAnalyze />} />
          <Route path="wallet" element={<OracleWalletAnalyzer />} />
          <Route path="token" element={<OracleTokenAnalyzer />} />
          <Route path="nft" element={<OracleNFTMonitor />} />
          <Route path="signals" element={<OracleSignals />} />
          <Route path="investigations" element={<OracleInvestigations />} />
          <Route path="reports" element={<OracleReports />} />
          <Route path="alerts" element={<OracleAlerts />} />
          <Route path="forensic" element={<OracleForensic />} />
          <Route path="history" element={<OracleHistory />} />
          <Route path="settings" element={<OracleSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
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
