import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, UserPlus, ScanFace } from 'lucide-react';
import clsx from 'clsx';

export default function MainLayout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/capture', label: 'Scan', icon: ScanFace, isPrimary: true },
    { to: '/register', label: 'Register', icon: UserPlus },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 w-full overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Face Scan System</h1>
          <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden pb-24 md:pb-0 h-full w-full">
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        {navItems.map((item) => {
          if (item.isPrimary) {
            return (
              <div key={item.to} className="relative -top-6">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-transform active:scale-95',
                      isActive ? 'bg-accent shadow-accent/40 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    )
                  }
                >
                  <item.icon className="w-8 h-8" />
                </NavLink>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 transition-colors px-4',
                  isActive ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
