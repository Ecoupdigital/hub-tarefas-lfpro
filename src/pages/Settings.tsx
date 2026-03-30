import React, { Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, Paintbrush, Keyboard, LayoutGrid, Shield
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ProfileSettings = React.lazy(() => import('@/components/settings/ProfileSettings'));
const NotificationSettings = React.lazy(() => import('@/components/settings/NotificationSettings'));
const AppearanceSettings = React.lazy(() => import('@/components/settings/AppearanceSettings'));
const ShortcutSettings = React.lazy(() => import('@/components/settings/ShortcutSettings'));
const BoardSettings = React.lazy(() => import('@/components/settings/BoardSettings'));
const AdminSettings = React.lazy(() => import('@/components/settings/AdminSettings'));

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  boardOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Meu Perfil', path: '/settings/profile', icon: User },
  { label: 'Notificacoes', path: '/settings/notifications', icon: Bell },
  { label: 'Aparencia', path: '/settings/appearance', icon: Paintbrush },
  { label: 'Atalhos', path: '/settings/shortcuts', icon: Keyboard },
  { label: 'Board', path: '/settings/board', icon: LayoutGrid, boardOnly: true },
  { label: 'Admin', path: '/settings/admin', icon: Shield },
];

const SettingsFallback = () => (
  <div className="flex items-center justify-center flex-1 h-full">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeBoard } = useApp();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.boardOnly || !!activeBoard
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top bar with back button */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-density-cell">Voltar</span>
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-density-cell font-semibold text-foreground">Configuracoes</span>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar nav */}
        <aside className="w-[240px] flex-shrink-0 bg-muted/30 border-r border-border flex flex-col py-4 px-2 overflow-y-auto">
          <p className="font-density-tiny font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            Configuracoes
          </p>
          <nav className="flex flex-col gap-0.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors font-density-cell text-left ${
                    isActive
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right content panel */}
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<SettingsFallback />}>
            <Routes>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="appearance" element={<AppearanceSettings />} />
              <Route path="shortcuts" element={<ShortcutSettings />} />
              {activeBoard && <Route path="board" element={<BoardSettings />} />}
              <Route path="admin" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="profile" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Settings;
