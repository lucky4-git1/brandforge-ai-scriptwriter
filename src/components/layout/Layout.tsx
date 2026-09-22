import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex min-h-screen gradient-bg">
      <Sidebar />
      <main className="flex-1 ml-64 min-w-0 overflow-x-hidden overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
