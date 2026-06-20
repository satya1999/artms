import { NavLink, useNavigate } from "react-router-dom";
import { cn, hasRole, effectiveRoles } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark, BrandLogo } from "@/components/BrandLogo";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Bus, BookOpen, CreditCard, Receipt,
  BookMarked, Building2, Wallet, BarChart3, UserCog, Settings,
  LogOut, ChevronLeft, TrendingUp, Users, Banknote, X, Trophy
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: UserRole[];
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/championship", icon: Trophy, label: "Championship" },

  { to: "/trips",    icon: Bus,       label: "Trips",         section: "Booking" },
  { to: "/book",     icon: BookOpen,  label: "New Booking",   roles: ["super_admin", "booking_executive"] },
  { to: "/bookings", icon: BookOpen,  label: "All Bookings",  roles: ["super_admin", "accountant", "booking_executive"] },
  { to: "/payments", icon: CreditCard,label: "Payments",      roles: ["super_admin", "accountant", "booking_executive"] },

  { to: "/expenses", icon: Receipt,   label: "Expenses",      roles: ["super_admin", "accountant"], section: "Accounting" },
  { to: "/cashbook", icon: BookMarked,label: "Cash Book",     roles: ["super_admin", "accountant"] },
  { to: "/bank",     icon: Building2, label: "Bank",          roles: ["super_admin", "accountant"] },
  { to: "/salary",   icon: Wallet,    label: "Salary",        roles: ["super_admin", "accountant"] },

  { to: "/reports",  icon: BarChart3, label: "P&L Reports",   roles: ["super_admin", "accountant"], section: "Reports" },

  { to: "/staff",       icon: Users,     label: "Staff",           roles: ["super_admin"], section: "Staff" },
  { to: "/staff-loans", icon: Banknote,  label: "Loans & Advances",roles: ["super_admin"] },
  { to: "/performance", icon: TrendingUp,label: "Performance",     roles: ["super_admin"] },

  { to: "/categories", icon: BookMarked, label: "Categories", roles: ["super_admin"], section: "Admin" },
  { to: "/users",      icon: UserCog,    label: "Users",      roles: ["super_admin"] },
  { to: "/settings",   icon: Settings,   label: "Settings",   roles: ["super_admin"] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  accountant: "Accountant",
  booking_executive: "Staff",
  tour_manager: "Tour Manager",
};

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(user, r))
  );

  let currentSection = "";

  const handleLogout = () => { logout(); navigate("/login"); };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const isMobile = !!onClose;

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 shrink-0",
      isMobile ? "w-72" : (collapsed ? "w-16" : "w-60")
    )}>
      {/* Logo / header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700/60">
        {collapsed && !isMobile ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto rounded-lg p-0.5 hover:bg-slate-800 transition-colors"
            aria-label="Expand sidebar"
          >
            <BrandMark className="h-9 w-9" />
          </button>
        ) : (
          <>
            <BrandLogo size="sm" onDark markClassName="h-9 w-9" subtitle="Travel Management" />
            <Button
              variant="ghost" size="icon"
              onClick={isMobile ? onClose : () => setCollapsed(true)}
              className="text-slate-400 hover:text-white hover:bg-slate-700 shrink-0"
            >
              {isMobile ? <X className="h-5 w-5" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>

      {/* User pill */}
      {(!collapsed || isMobile) && user && (
        <div className="mx-3 my-3 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-xs font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {effectiveRoles(user).map((r) => ROLE_LABELS[r]).join(" / ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const showSection = (!collapsed || isMobile) && item.section && item.section !== currentSection;
          if (showSection) currentSection = item.section!;
          return (
            <div key={item.to}>
              {showSection && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1 select-none">
                  {item.section}
                </p>
              )}
              <NavLink
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-slate-700/60">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-slate-300 hover:bg-slate-800 hover:text-white text-sm rounded-xl",
            collapsed && !isMobile ? "justify-center px-2" : "justify-start gap-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && "Logout"}
        </Button>
      </div>
    </aside>
  );
}
