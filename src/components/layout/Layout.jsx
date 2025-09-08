import { Outlet } from 'react-router-dom';
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area - this is where child routes render */}
      <main className="flex-1">
        <Outlet />
      </main>

    </div>
  );
}