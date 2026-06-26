import { lazy, Suspense, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { BrandMark } from "@/components/BrandLogo";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import SplashScreen from "@/components/SplashScreen";

// Route pages are code-split so each screen (and heavy libs like Recharts)
// loads on demand instead of bloating the initial bundle.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TripManagement = lazy(() => import("@/pages/TripManagement"));
const BookingManagement = lazy(() => import("@/pages/BookingManagement"));
const PaymentCollection = lazy(() => import("@/pages/PaymentCollection"));
const ExpenseManagement = lazy(() => import("@/pages/ExpenseManagement"));
const CashBook = lazy(() => import("@/pages/CashBook"));
const BankManagement = lazy(() => import("@/pages/BankManagement"));
const SalaryManagement = lazy(() => import("@/pages/SalaryManagement"));
const ProfitLoss = lazy(() => import("@/pages/ProfitLoss"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const Settings = lazy(() => import("@/pages/Settings"));
const NewBooking = lazy(() => import("@/pages/NewBooking"));
const StaffPerformance = lazy(() => import("@/pages/StaffPerformance"));
const CategoryManagement = lazy(() => import("@/pages/CategoryManagement"));
const StaffManagement = lazy(() => import("@/pages/StaffManagement"));
const StaffLoan = lazy(() => import("@/pages/StaffLoan"));
const Championship = lazy(() => import("@/pages/Championship"));
const TourManagerPanel = lazy(() => import("@/pages/TourManagerPanel"));
const TripWallet = lazy(() => import("@/pages/TripWallet"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <BrandMark className="h-14 w-14 animate-pulse" glow />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={hideSplash} />}
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/trips" element={<TripManagement />} />
                  <Route path="/bookings" element={<BookingManagement />} />
                  <Route path="/payments" element={<PaymentCollection />} />
                  <Route path="/expenses" element={<ExpenseManagement />} />
                  <Route path="/cashbook" element={<CashBook />} />
                  <Route path="/bank" element={<BankManagement />} />
                  <Route path="/salary" element={<SalaryManagement />} />
                  <Route path="/reports" element={<ProfitLoss />} />
                  <Route path="/book" element={<NewBooking />} />
                  <Route path="/performance" element={<StaffPerformance />} />
                  <Route path="/championship" element={<Championship />} />
                  <Route path="/tour-manager" element={<TourManagerPanel />} />
                  <Route path="/trip-wallets" element={<TripWallet />} />
                  <Route path="/categories" element={<CategoryManagement />} />
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="/staff-loans" element={<StaffLoan />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
    </>
  );
}
