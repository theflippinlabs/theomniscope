import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Disclaimer } from './Disclaimer';

interface AppShellProps {
  unreadAlerts: number;
}

export function AppShell({ unreadAlerts }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Disclaimer />
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNav unreadAlerts={unreadAlerts} />
    </div>
  );
}
