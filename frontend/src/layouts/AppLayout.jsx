import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import NotificationDrawer from './NotificationDrawer';
import { useUIStore } from '../store/useUIStore';

export default function AppLayout() {
  const { isSidebarCollapsed } = useUIStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Top Navbar */}
      <TopNavbar onOpenNotifications={() => setIsNotifOpen(true)} />

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* Main Content Area */}
      <main
        className={`flex-1 pt-20 px-6 pb-12 z-10 transition-all duration-300 min-h-screen ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

