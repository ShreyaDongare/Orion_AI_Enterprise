import React, { useState } from 'react';
import {
  Search,
  Bell,
  Folder,
  ChevronDown,
  LogOut,
  Settings,
  Check
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useProjectStore } from '../store/useProjectStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopNavbar({ onOpenNotifications }) {
  const { isSidebarCollapsed } = useUIStore();
  const { projects = [], activeProject, setActiveProject } = useProjectStore();
  const { user, logout } = useAuthStore();
  const { notifications = [] } = useUIStore();
  const navigate = useNavigate();

  const [projectDropdown, setProjectDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Search Input & Project Selector */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents, projects, documents, or reports..."
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-xl border border-slate-200 pl-9 pr-4 py-2 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
          />
        </div>

        {/* Project Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProjectDropdown(!projectDropdown)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-800 transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold max-w-[120px] truncate">{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <AnimatePresence>
            {projectDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 p-2 shadow-lg z-50 space-y-1"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Project Scope
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProject(p);
                      setProjectDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      activeProject?.id === p.id
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {activeProject?.id === p.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Navbar Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          title="Notifications"
          className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:border-slate-300 transition-all"
          >
            <Avatar name={user?.first_name || 'Alex Vance'} src={user?.avatar} size="sm" />
          </button>

          <AnimatePresence>
            {userDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 p-2 shadow-lg z-50 space-y-1"
              >
                <div className="p-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings');
                    setUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" /> Account Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}



