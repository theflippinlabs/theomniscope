import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useUserPreferences } from "@/lib/userPreferences";
import { useMarketData } from "@/hooks/useMarketData";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/lib/i18n";
import InvitationGate from "@/components/InvitationGate";
import Onboarding from "@/pages/Onboarding";
import Radar from "@/pages/Radar";
import Opportunities from "@/pages/Opportunities";
import AlertsPage from "@/pages/AlertsPage";
import Profile from "@/pages/Profile";
import TokenDetail from "@/pages/TokenDetail";
import NewListings from "@/pages/NewListings";
import Lookup from "@/pages/Lookup";
import Admin from "@/pages/Admin";
import CommandCenter from "@/pages/CommandCenter";
import TokenIntel from "@/pages/TokenIntel";
import WatchlistsPage from "@/pages/WatchlistsPage";
import ServerAlertsPage from "@/pages/ServerAlertsPage";
import AlertRulesPage from "@/pages/AlertRulesPage";
import CasesListPage from "@/pages/CasesListPage";
import CaseDetailPage from "@/pages/CaseDetailPage";
import SharedCasePage from "@/pages/SharedCasePage";
import WalletDetail from "@/pages/WalletDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { prefs, updatePrefs } = useUserPreferences();
  const { unreadAlerts } = useMarketData();
  const [hasAccess, setHasAccess] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/shared-case/:token" element={<SharedCasePage />} />
        <Route
          path="*"
          element={
            !hasAccess ? (
              <InvitationGate onGranted={() => setHasAccess(true)} />
            ) : !prefs.onboardingComplete ? (
              <Onboarding onComplete={updatePrefs} />
            ) : (
              <Routes>
                <Route element={<AppShell unreadAlerts={unreadAlerts} />}>
                  <Route path="/" element={<CommandCenter />} />
                  <Route path="/radar" element={<Radar prefs={prefs} />} />
                  <Route path="/new-listings" element={<NewListings />} />
                  <Route path="/lookup" element={<Lookup />} />
                  <Route path="/intel" element={<TokenIntel />} />
                  <Route path="/intel/:address" element={<TokenIntel />} />
                  <Route path="/opportunities" element={<Opportunities prefs={prefs} />} />
                  <Route path="/watchlists" element={<WatchlistsPage />} />
                  <Route path="/wallet/:address" element={<WalletDetail />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/server-alerts" element={<ServerAlertsPage />} />
                  <Route path="/alert-rules" element={<AlertRulesPage />} />
                  <Route path="/cases" element={<CasesListPage />} />
                  <Route path="/cases/:id" element={<CaseDetailPage />} />
                  <Route path="/profile" element={<Profile prefs={prefs} onUpdatePrefs={updatePrefs} />} />
                </Route>
                <Route path="/token/:id" element={<TokenDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )
          }
        />
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
