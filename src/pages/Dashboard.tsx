import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/lib/utils";
import AdminDashboard from "./AdminDashboard";
import StaffDashboard from "./StaffDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  // Show staff dashboard only when user has staff roles but NOT admin/accountant access
  const isStaff = hasRole(user, "booking_executive", "tour_manager") && !hasRole(user, "super_admin", "accountant");
  return isStaff ? <StaffDashboard /> : <AdminDashboard />;
}
