import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Search, Send, Bell, User, PlusCircle, LogOut, Settings } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { getUnreadMessagesCount, getUnreadNotificationsCount } from '../../services';

// ============================================================
// Types & Navigation Config
// ============================================================

interface SidebarLink {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

// ============================================================
// Component
// ============================================================

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const fetchCounts = async () => {
      try {
        const chatCount = await getUnreadMessagesCount(currentUser.id);
        const notifCount = await getUnreadNotificationsCount(currentUser.id);
        setUnreadChat(chatCount);
        setUnreadNotif(notifCount);
      } catch (err) {
        console.error('Failed to poll unread counts:', err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return null;

  const links: SidebarLink[] = [
    {
      label: 'Beranda',
      path: '/',
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: 'Pencarian',
      path: '/search',
      icon: <Search className="h-5 w-5" />,
    },
    {
      label: 'Pesan',
      path: '/chat',
      icon: <Send className="h-5 w-5 -rotate-12 mt-[-2px]" />,
      badge: unreadChat,
    },
    {
      label: 'Notifikasi',
      path: '/notifications',
      icon: <Bell className="h-5 w-5" />,
      badge: unreadNotif,
    },
    {
      label: 'Profil',
      path: `/profile/${currentUser.username}`,
      icon: <User className="h-5 w-5" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 xl:w-72 h-screen bg-surface-950 border-r border-surface-900/80 p-6 fixed left-0 top-0 z-30 transition-all duration-200">
      {/* Top Section */}
      <div className="flex flex-col gap-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 select-none px-2">
          <span className="font-sans font-extrabold text-2xl xl:text-3xl tracking-tight text-transparent bg-clip-text bg-brand-gradient">
            Twistgram
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5" aria-label="Menu navigasi utama">
          {links.map((link) => {
            const isActive =
              link.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.path);

            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={[
                  'flex items-center justify-between px-4 py-3 rounded-xl',
                  'font-medium text-sm transition-all duration-200 select-none group',
                  isActive
                     ? 'bg-brand-500/10 text-brand-400 font-semibold shadow-glow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-900',
                ].join(' ')}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={[
                      'transition-transform duration-200 group-hover:scale-105',
                      isActive ? 'text-brand-400' : 'text-neutral-400 group-hover:text-neutral-200',
                    ].join(' ')}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>

                {/* Badge if available */}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse-glow">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Create Post Button */}
        <Link
          to="/posts/create"
          className={[
            'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl',
            'bg-brand-gradient text-white font-semibold text-sm',
            'shadow-glow-sm hover:shadow-glow-md hover:opacity-95 active:scale-[0.98]',
            'transition-all duration-200 select-none cursor-pointer',
          ].join(' ')}
        >
          <PlusCircle className="h-5 w-5" />
          <span>Buat Postingan</span>
        </Link>
      </div>

      {/* Bottom Section - User Profile Card */}
      <div className="flex flex-col gap-4 border-t border-surface-900 pt-4">
        {/* User Card */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Avatar
              name={currentUser.name}
              size="sm"
              src={currentUser.avatar_url}
            />
            <div className="flex flex-col text-left overflow-hidden max-w-[120px]">
              <span className="text-xs font-semibold text-neutral-200 truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-neutral-500 truncate">
                @{currentUser.username}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Settings Link */}
            <Link
              to="/profile/edit"
              className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-lg hover:bg-surface-900 transition-colors"
              title="Pengaturan"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>

            {/* Logout Trigger */}
            <button
              type="button"
              onClick={logout}
              className="text-neutral-500 hover:text-danger-400 p-1.5 rounded-lg hover:bg-danger-500/10 transition-colors"
              title="Keluar"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
