import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Menu } from "lucide-react";
import { BrandMark, BrandLogo } from "@/components/BrandLogo";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const { isLoading } = useData();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center gap-4">
          <BrandMark className="h-20 w-20 animate-pulse" glow />
          <div className="space-y-1">
            <BrandLogo size="md" className="justify-center" />
            <p className="text-sm text-slate-500 font-medium">Connecting to your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar — always visible ≥ lg */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden shadow-2xl">
            <Sidebar onClose={() => setMobileNavOpen(false)} />
          </div>
        </>
      )}

      {/* Content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center h-14 px-3 bg-slate-900 text-white shrink-0 gap-2">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo size="sm" onDark markClassName="h-7 w-7" />
        </header>

        <main className="flex-1 overflow-y-auto ar-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
