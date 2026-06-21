import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Send } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { getUnreadMessagesCount } from '../../services';

// ============================================================
// Component
// ============================================================

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const fetchChatCount = async () => {
      try {
        const count = await getUnreadMessagesCount(currentUser.id);
        setUnreadChat(count);
      } catch {}
    };

    fetchChatCount();
    const interval = setInterval(fetchChatCount, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return null;

  const chatBadge = unreadChat;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-surface-950/90 backdrop-blur-md border-t border-surface-900/80 md:hidden flex items-center justify-around px-2 select-none">
      {/* Home Link */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          [
            'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
            isActive ? 'text-brand-400' : 'text-neutral-400 active:bg-surface-900',
          ].join(' ')
        }
      >
        <Home className="h-5.5 w-5.5" />
        <span className="text-[9px] mt-0.5 font-medium">Beranda</span>
      </NavLink>

      {/* Search Link */}
      <NavLink
        to="/search"
        className={({ isActive }) =>
          [
            'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
            isActive ? 'text-brand-400' : 'text-neutral-400 active:bg-surface-900',
          ].join(' ')
        }
      >
        <Search className="h-5.5 w-5.5" />
        <span className="text-[9px] mt-0.5 font-medium">Cari</span>
      </NavLink>

      {/* Special Create Post Button */}
      <Link
        to="/posts/create"
        className="flex items-center justify-center w-11 h-11 rounded-full bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow-md active:scale-95 transition-all duration-200"
        aria-label="Buat Postingan Baru"
      >
        <Plus className="h-6 w-6 font-bold" />
      </Link>

      {/* Chat Link */}
      <NavLink
        to="/chat"
        className={({ isActive }) =>
          [
            'relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
            isActive ? 'text-brand-400' : 'text-neutral-400 active:bg-surface-900',
          ].join(' ')
        }
      >
        <Send className="h-5.5 w-5.5 -rotate-12 mt-[-2px]" />
        <span className="text-[9px] mt-0.5 font-medium">Pesan</span>

        {/* Small badge */}
        {chatBadge > 0 && (
          <span className="absolute top-1 right-2.5 h-4 min-w-4 px-1 rounded-full bg-danger-500 text-white text-[8px] font-bold flex items-center justify-center shadow">
            {chatBadge}
          </span>
        )}
      </NavLink>

      {/* Profile Link */}
      <NavLink
        to={`/profile/${currentUser.username}`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
            isActive ? 'text-brand-400' : 'text-neutral-400 active:bg-surface-900',
          ].join(' ')
        }
      >
        <Avatar
          name={currentUser.name}
          size="xs"
          src={currentUser.avatar_url}
          // Add border wrapper if active
          className={location.pathname.startsWith(`/profile/${currentUser.username}`) ? 'ring-2 ring-brand-400' : ''}
        />
        <span className="text-[9px] mt-0.5 font-medium">Profil</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
