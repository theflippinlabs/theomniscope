import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radar, Rocket, Zap, Star, Bell, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface BottomNavProps {
  unreadAlerts?: number;
}

export function BottomNav({ unreadAlerts = 0 }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const tabs = [
    { path: '/', label: t('nav.radar'), icon: Radar },
    { path: '/new-listings', label: t('nav.new'), icon: Rocket },
    { path: '/opportunities', label: t('nav.signals'), icon: Zap },
    { path: '/alerts', label: t('nav.alerts'), icon: Bell },
    { path: '/profile', label: t('nav.profile'), icon: User },
  ];

  if (location.pathname.startsWith('/token/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[56px] transition-all relative ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                {tab.path === '/alerts' && unreadAlerts > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-danger text-[9px] font-bold flex items-center justify-center text-danger-foreground"
                  >
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
