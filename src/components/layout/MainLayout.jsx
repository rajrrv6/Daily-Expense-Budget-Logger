import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function MainLayout() {
  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content display frame */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header toolbar */}
        <TopHeader />

        {/* Scrollable workspace viewport */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
