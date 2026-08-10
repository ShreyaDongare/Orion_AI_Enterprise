import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  activeModal: null, // 'newProject' | 'uploadDoc' | 'newChat' | null
  notifications: [
    {
      id: 'notif_1',
      title: 'Report Ready',
      message: 'Q3 Executive Performance Report PDF is generated and ready for download.',
      type: 'success',
      time: '10m ago',
      read: false
    },
    {
      id: 'notif_2',
      title: 'Vector Ingestion Completed',
      message: 'ChromaDB successfully chunked 14 compliance documents in Security collection.',
      type: 'info',
      time: '1h ago',
      read: false
    },
    {
      id: 'notif_3',
      title: 'Gemini Key Manager',
      message: 'Automatic key rotation executed cleanly with 0 downtime.',
      type: 'system',
      time: '3h ago',
      read: true
    }
  ],

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  openModal: (modalName) => set({ activeModal: modalName }),
  closeModal: () => set({ activeModal: null }),

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),

  clearAllNotifications: () => set({ notifications: [] })
}));
