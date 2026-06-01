import React from 'react';
import Navigation from './Navigation';
import Header from './Header';
import { usePosStore } from '../store/posStore';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = usePosStore(state => state.isSidebarCollapsed);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {!isSidebarCollapsed && <Navigation />}
      <div className="flex-1 flex flex-col h-full">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Compliance Footer */}
        <footer className="bg-white border-t border-gray-200 p-4 text-center text-xs text-gray-500">
          <div className="flex justify-center items-center gap-6">
            <span>© 2024 Whizpoint Solutions</span>
            <a href="mailto:support@whizpoint.app" className="hover:text-sky-500 transition-colors">support@whizpoint.app</a>
            <a href="https://pos.whizpoint.app" target="_blank" rel="noreferrer" className="hover:text-sky-500 transition-colors">pos.whizpoint.app</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
