import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function KioskLayout() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      {/* Optional back button for dev/testing, could be hidden in real kiosk */}
      <div className="absolute top-4 left-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Admin</span>
        </Link>
      </div>

      <main className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
