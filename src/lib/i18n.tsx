import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'en' | 'fr';

const translations = {
  // InvitationGate
  'gate.subtitle': { en: 'Invitation only access', fr: 'Accès sur invitation uniquement' },
  'gate.placeholder': { en: 'Enter your invitation code', fr: "Entrez votre code d'invitation" },
  'gate.submit': { en: 'Access', fr: 'Accéder' },
  'gate.invalidCode': { en: 'Invalid code.', fr: 'Code invalide.' },
  'gate.alreadyUsed': { en: 'This code has already been used.', fr: 'Ce code a déjà été utilisé.' },
  'gate.error': { en: 'Error, please try again.', fr: 'Erreur, réessayez.' },
  'gate.byLabs': { en: 'by The Flippin\' Labs', fr: 'by The Flippin\' Labs' },

  // Onboarding
  'onboarding.simple': { en: 'Simple', fr: 'Simple' },
  'onboarding.simpleDesc': { en: 'Clean signals, intuitive interface. Perfect to start.', fr: 'Signaux clairs, interface intuitive. Parfait pour débuter.' },
  'onboarding.recommended': { en: 'Recommended', fr: 'Recommandé' },
  'onboarding.pro': { en: 'Pro', fr: 'Pro' },
  'onboarding.proDesc': { en: 'All data, technical indicators, detailed risk scanner.', fr: 'Toutes les données, indicateurs techniques, scanner de risque détaillé.' },
  'onboarding.riskTitle': { en: 'Risk Profile', fr: 'Profil de risque' },
  'onboarding.riskSubtitle': { en: 'Filters signals based on your tolerance', fr: 'Filtre les signaux selon votre tolérance' },
  'onboarding.conservative': { en: 'Conservative', fr: 'Conservateur' },
  'onboarding.conservativeDesc': { en: 'High confidence only. Established tokens, low risk.', fr: 'Haute confiance uniquement. Tokens établis, faible risque.' },
  'onboarding.standard': { en: 'Standard', fr: 'Standard' },
  'onboarding.standardDesc': { en: 'Balanced risk/reward. Medium to high confidence signals.', fr: 'Rapport risque/rendement équilibré. Signaux de confiance moyenne à haute.' },
  'onboarding.aggressive': { en: 'Aggressive', fr: 'Agressif' },
  'onboarding.aggressiveDesc': { en: 'All signals including high risk. For experienced traders.', fr: 'Tous les signaux, y compris haut risque. Pour traders expérimentés.' },
  'onboarding.chainsTitle': { en: 'Chains', fr: 'Blockchains' },
  'onboarding.chainsSubtitle': { en: 'Select blockchains to monitor', fr: 'Sélectionnez les blockchains à surveiller' },
  'onboarding.alertsTitle': { en: 'Alerts', fr: 'Alertes' },
  'onboarding.alertsSubtitle': { en: 'Choose what triggers notifications', fr: 'Choisissez ce qui déclenche les notifications' },
  'onboarding.back': { en: 'Back', fr: 'Retour' },
  'onboarding.continue': { en: 'Continue', fr: 'Continuer' },
  'onboarding.launch': { en: 'Launch ORACLE', fr: 'Lancer ORACLE' },
  'onboarding.price': { en: 'Price', fr: 'Prix' },
  'onboarding.priceDesc': { en: 'Alert when price crosses a threshold', fr: 'Alerte quand le prix franchit un seuil' },
  'onboarding.volume': { en: 'Volume', fr: 'Volume' },
  'onboarding.volumeDesc': { en: 'Volume spikes or unusual transactions', fr: 'Pics de volume ou transactions inhabituelles' },
  'onboarding.signals': { en: 'Signals', fr: 'Signaux' },
  'onboarding.signalsDesc': { en: 'New Entry / Exit / Avoid signals', fr: 'Nouveaux signaux Entrée / Sortie / Éviter' },
  'onboarding.risk': { en: 'Risk', fr: 'Risque' },
  'onboarding.riskDesc': { en: 'Risk score changes', fr: 'Changements de score de risque' },

  // Radar
  'radar.title': { en: 'Radar', fr: 'Radar' },
  'radar.brief': { en: 'Brief', fr: 'Brief' },
  'radar.search': { en: 'Search symbol or address...', fr: 'Rechercher un symbole ou adresse...' },
  'radar.allChains': { en: 'All Chains', fr: 'Toutes' },
  'radar.topGainers': { en: 'Top Gainers', fr: 'Top Hausse' },
  'radar.topLosers': { en: 'Top Losers', fr: 'Top Baisse' },
  'radar.topVolume': { en: 'Top Volume', fr: 'Top Volume' },
  'radar.newListings': { en: 'New Listings', fr: 'Nouveaux Listings' },
  'radar.dangerZone': { en: 'Danger Zone', fr: 'Zone de Danger' },
  'radar.allTokens': { en: 'All Tokens', fr: 'Tous les Tokens' },
  'radar.sortVolume': { en: 'Volume', fr: 'Volume' },
  'radar.sortMcap': { en: 'MCap', fr: 'MCap' },
  'radar.sortLiq': { en: 'Liquidity', fr: 'Liquidité' },
  'radar.sortHolders': { en: 'Holders', fr: 'Holders' },
  'radar.sortNew': { en: 'Newest', fr: 'Récents' },
  'radar.sortVol': { en: 'Volatility', fr: 'Volatilité' },

  // Opportunities
  'opps.title': { en: 'Opportunities', fr: 'Opportunités' },
  'opps.safeOnly': { en: 'Safe Only', fr: 'Sûrs uniquement' },
  'opps.sort': { en: 'Sort:', fr: 'Tri :' },
  'opps.all': { en: 'All', fr: 'Tous' },
  'opps.strong': { en: 'Strong', fr: 'Fort' },
  'opps.buy': { en: 'Buy', fr: 'Achat' },
  'opps.watch': { en: 'Watch', fr: 'Surveiller' },
  'opps.avoid': { en: 'Avoid', fr: 'Éviter' },
  'opps.noSafe': { en: 'No safe opportunities right now.', fr: 'Aucune opportunité sûre pour le moment.' },
  'opps.noSafeHint': { en: 'Market conditions may not favor safe entries — patience is a strategy.', fr: 'Les conditions de marché ne favorisent pas les entrées sûres — la patience est une stratégie.' },
  'opps.none': { en: 'No opportunities detected.', fr: 'Aucune opportunité détectée.' },
  'opps.noneHint': { en: 'Scanner running continuously.', fr: 'Scanner en fonctionnement continu.' },

  // Alerts
  'alerts.title': { en: 'Alerts', fr: 'Alertes' },
  'alerts.new': { en: 'new', fr: 'nouveau' },
  'alerts.readAll': { en: 'Read all', fr: 'Tout lire' },
  'alerts.none': { en: 'No alerts yet.', fr: 'Aucune alerte pour le moment.' },

  // Watchlists
  'watch.title': { en: 'Watchlists', fr: 'Listes de suivi' },
  'watch.favorites': { en: 'Favorites', fr: 'Favoris' },
  'watch.scalp': { en: 'Scalp', fr: 'Scalp' },
  'watch.swing': { en: 'Swing', fr: 'Swing' },
  'watch.watchTab': { en: 'Watch', fr: 'Surveiller' },
  'watch.noFavorites': { en: 'No favorites yet. Star tokens from the Radar.', fr: 'Aucun favori. Ajoutez des tokens depuis le Radar.' },
  'watch.emptyList': { en: 'This list is empty.', fr: 'Cette liste est vide.' },

  // Profile / Settings
  'profile.title': { en: 'Settings', fr: 'Réglages' },
  'profile.appearance': { en: 'Appearance', fr: 'Apparence' },
  'profile.light': { en: 'Light', fr: 'Clair' },
  'profile.dark': { en: 'Dark', fr: 'Sombre' },
  'profile.displayMode': { en: 'Display Mode', fr: "Mode d'affichage" },
  'profile.riskProfile': { en: 'Risk Profile', fr: 'Profil de risque' },
  'profile.activeChains': { en: 'Active Chains', fr: 'Blockchains actives' },
  'profile.resetOnboarding': { en: 'Reset Onboarding', fr: "Réinitialiser l'accueil" },
  'profile.disclaimer': { en: 'Information only — not financial advice', fr: 'Information uniquement — pas un conseil financier' },

  // Token Detail
  'token.notFound': { en: 'Token not found', fr: 'Token introuvable' },
  'token.back': { en: 'Back', fr: 'Retour' },
  'token.metrics': { en: 'Metrics', fr: 'Métriques' },
  'token.indicators': { en: 'Indicators', fr: 'Indicateurs' },
  'token.riskScanner': { en: 'Risk Scanner', fr: 'Scanner de risque' },
  'token.safe': { en: 'Safe', fr: 'Sûr' },
  'token.critical': { en: 'Critical', fr: 'Critique' },
  'token.whosBuying': { en: "Who's Buying", fr: 'Qui achète' },
  'token.netFlow': { en: 'Net Flow', fr: 'Flux net' },
  'token.winnerWallets': { en: 'Winner Wallets', fr: 'Wallets gagnants' },
  'token.newWallets': { en: 'New Wallets', fr: 'Nouveaux wallets' },
  'token.topNetBuyers': { en: 'Top Net Buyers', fr: 'Top acheteurs nets' },
  'token.smartMoneySignals': { en: 'Smart Money Signals', fr: 'Signaux Smart Money' },
  'token.noSmartMoney': { en: 'No smart money activity detected for this token.', fr: 'Aucune activité smart money détectée pour ce token.' },
  'token.signals': { en: 'Signals', fr: 'Signaux' },
  'token.onChain': { en: 'On-chain Activity', fr: 'Activité on-chain' },
  'token.buys': { en: 'Buys', fr: 'Achats' },
  'token.sells': { en: 'Sells', fr: 'Ventes' },
  'token.buyPressure': { en: 'Buy pressure', fr: 'Pression achat' },
  'token.sellPressure': { en: 'Sell pressure', fr: 'Pression vente' },
  'token.executionWarning': { en: 'Execution Warning', fr: "Avertissement d'exécution" },

  // Daily Brief
  'brief.title': { en: 'Daily Brief', fr: 'Brief du jour' },
  'brief.topOpps': { en: 'Top Opportunities', fr: 'Meilleures opportunités' },
  'brief.noOpps': { en: 'No strong opportunities right now.', fr: 'Aucune opportunité forte pour le moment.' },
  'brief.noOppsHint': { en: 'Market conditions may not favor entries — patience is a strategy.', fr: 'Les conditions de marché ne favorisent pas les entrées — la patience est une stratégie.' },
  'brief.topDangers': { en: 'Top Dangers', fr: 'Principaux dangers' },
  'brief.allSafe': { en: 'All monitored tokens within acceptable risk.', fr: 'Tous les tokens surveillés dans un risque acceptable.' },

  // Disclaimer
  'disclaimer.label': { en: 'Disclaimer:', fr: 'Avertissement :' },
  'disclaimer.text': { en: 'Information only — not financial advice. Signals are rule-based, no guarantee of profit.', fr: 'Information uniquement — pas un conseil financier. Les signaux sont basés sur des règles, aucune garantie de profit.' },

  // New Listings
  'newListings.title': { en: 'New Listings', fr: 'Nouveaux Listings' },
  'newListings.detected': { en: 'detected', fr: 'détectés' },
  'newListings.allTime': { en: 'All', fr: 'Tous' },
  'newListings.hotNew': { en: '🔥 Hot New Tokens', fr: '🔥 Nouveaux Tokens Chauds' },
  'newListings.riskyNew': { en: '⚠ Risky New Tokens', fr: '⚠ Nouveaux Tokens Risqués' },
  'newListings.allNew': { en: 'All New Listings', fr: 'Tous les Nouveaux' },
  'newListings.none': { en: 'No new listings in this time window.', fr: 'Aucun nouveau listing dans cette période.' },

  // Bottom Nav
  'nav.radar': { en: 'Radar', fr: 'Radar' },
  'nav.new': { en: 'New', fr: 'Nouveaux' },
  'nav.signals': { en: 'Signals', fr: 'Signaux' },
  'nav.watch': { en: 'Watch', fr: 'Suivi' },
  'nav.alerts': { en: 'Alerts', fr: 'Alertes' },
  'nav.profile': { en: 'Profile', fr: 'Profil' },

  // Admin
  'admin.title': { en: 'Admin ORACLE', fr: 'Admin ORACLE' },
  'admin.emailPlaceholder': { en: 'Email', fr: 'Email' },
  'admin.passwordPlaceholder': { en: 'Password', fr: 'Mot de passe' },
  'admin.loginError': { en: 'Invalid email or password', fr: 'Email ou mot de passe incorrect' },
  'admin.access': { en: 'Sign in', fr: 'Se connecter' },
  'admin.invitationCodes': { en: 'Invitation Codes', fr: "Codes d'invitation" },
  'admin.generate': { en: 'Generate a code', fr: 'Générer un code' },
  'admin.used': { en: 'Used', fr: 'Utilisé' },
  'admin.available': { en: 'Available', fr: 'Disponible' },
  'admin.noCodes': { en: 'No codes created. Click "Generate a code" to start.', fr: 'Aucun code créé. Cliquez sur "Générer un code" pour commencer.' },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('oracle_lang') as Lang) || 'en';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('oracle_lang', l);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'fr' : 'en');
  }, [lang, setLang]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
