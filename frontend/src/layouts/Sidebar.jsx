import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  Database,
  BarChart3,
  FileText,
  Presentation,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import Avatar from '../components/Avatar';

export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Workspace', path: '/workspace', icon: Bot, badge: 'Multi-Agent' },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Knowledge Base', path: '/knowledge', icon: Database },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Presentations', path: '/presentations', icon: Presentation },
    { name: 'Email History', path: '/emails', icon: Mail },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight font-heading flex items-center gap-1">
                Orion<span className="text-blue-600">AI</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Enterprise Platform</p>
            </motion.div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-colors" />
              {!isSidebarCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {!isSidebarCollapsed && item.badge && (
                <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Avatar name={user?.first_name || 'Alex Vance'} src={user?.avatar} size="sm" />
          {!isSidebarCollapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-mono">{user?.role || 'Admin'}</p>
            </div>
          )}
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-200/50 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}


