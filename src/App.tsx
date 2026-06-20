import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import TripManagement from "@/pages/TripManagement";
import BookingManagement from "@/pages/BookingManagement";
import PaymentCollection from "@/pages/PaymentCollection";
import ExpenseManagement from "@/pages/ExpenseManagement";
import CashBook from "@/pages/CashBook";
import BankManagement from "@/pages/BankManagement";
import SalaryManagement from "@/pages/SalaryManagement";
import ProfitLoss from "@/pages/ProfitLoss";
import UserManagement from "@/pages/UserManagement";
import Settings from "@/pages/Settings";
import NewBooking from "@/pages/NewBooking";
import StaffPerformance from "@/pages/StaffPerformance";
import CategoryManagement from "@/pages/CategoryManagement";
import StaffManagement from "@/pages/StaffManagement";
import StaffLoan from "@/pages/StaffLoan";
import Championship from "@/pages/Championship";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
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
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/staff-loans" element={<StaffLoan />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
