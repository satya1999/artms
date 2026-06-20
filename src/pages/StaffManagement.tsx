import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { StaffMember, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Edit2, Trash2, Eye, Users, UserCheck, UserX,
  TrendingUp, Phone, Mail, MapPin, CreditCard, Banknote, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  super_admin:       { label: "Admin",           className: "bg-purple-100 text-purple-700" },
  accountant:        { label: "Accountant",       className: "bg-blue-100 text-blue-700" },
  booking_executive: { label: "Booking Staff",    className: "bg-green-100 text-green-700" },
  tour_manager:      { label: "Field Manager",    className: "bg-orange-100 text-orange-700" },
};

const DEPARTMENTS = ["Management", "Sales", "Finance", "Operations", "Admin", "Support"];

const ALL_ROLES = Object.keys(ROLE_META) as UserRole[];

const effectiveRoles = (s: StaffMember): UserRole[] =>
  (s.roles && s.roles.length > 0) ? s.roles : [s.role];

const EMPTY: Omit<StaffMember, "id" | "createdAt"> = {
  name: "", mobile: "", email: "", address: "", aadhaar: "",
  joiningDate: "", designation: "", department: "Sales",
  role: "booking_executive", roles: ["booking_executive"],
  monthlySalary: 0, status: "active",
};

export default function StaffManagement() {
  const { staff, setStaff, bookings, trips, staffLoans, loanRepayments } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const f = (field: keyof typeof EMPTY, val: string | number) =>
    setForm(p => ({ ...p, [field]: val }));

  const toggleRole = (role: UserRole) =>
    setForm(prev => {
      const cur = prev.roles ?? [prev.role];
      const has = cur.includes(role);
      if (has && cur.length === 1) return prev; // keep at least one
      const next = has ? cur.filter(r => r !== role) : [...cur, role];
      return { ...prev, roles: next, role: next[0] };
    });

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(s => s.status === "active").length,
    inactive: staff.filter(s => s.status === "inactive").length,
    totalPayroll: staff.filter(s => s.status === "active").reduce((sum, s) => sum + s.monthlySalary, 0),
  }), [staff]);

  const filtered = useMemo(() => staff.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.mobile.includes(q) ||
      s.email.toLowerCase().includes(q) || s.designation.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || effectiveRoles(s).includes(roleFilter);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [staff, search, roleFilter, statusFilter]);

  // Per-staff performance derived from bookings
  const perfMap = useMemo(() => {
    const map: Record<string, { bookings: number; revenue: number; advance: number; pending: number; activeTrips: number }> = {};
    staff.forEach(s => { map[s.name] = { bookings: 0, revenue: 0, advance: 0, pending: 0, activeTrips: 0 }; });
    bookings.forEach(b => {
      if (!map[b.collectedBy]) return;
      if (b.status === "cancelled") return;
      map[b.collectedBy].bookings++;
      map[b.collectedBy].revenue += b.finalAmount;
      map[b.collectedBy].advance += b.advancePaid;
      map[b.collectedBy].pending += b.pendingAmount;
    });
    // active trips: distinct trips where staff has a non-cancelled booking and trip is published/active
    const activeTripIds = new Set(trips.filter(t => t.status === "published" || t.status === "active").map(t => t.id));
    bookings.forEach(b => {
      if (b.status === "cancelled" || !activeTripIds.has(b.tripId) || !map[b.collectedBy]) return;
      map[b.collectedBy].activeTrips = (map[b.collectedBy].activeTrips || 0);
    });
    // Count distinct active trip assignments per staff
    const activeBookingsByStaff: Record<string, Set<string>> = {};
    bookings.filter(b => b.status !== "cancelled" && activeTripIds.has(b.tripId)).forEach(b => {
      if (!activeBookingsByStaff[b.collectedBy]) activeBookingsByStaff[b.collectedBy] = new Set();
      activeBookingsByStaff[b.collectedBy].add(b.tripId);
    });
    Object.entries(activeBookingsByStaff).forEach(([name, tripSet]) => {
      if (map[name]) map[name].activeTrips = tripSet.size;
    });
    return map;
  }, [bookings, staff, trips]);

  // Per-staff loan summary
  const loanMap = useMemo(() => {
    const map: Record<string, { activeLoans: number; totalOutstanding: number }> = {};
    staffLoans.forEach(l => {
      if (!map[l.staffId]) map[l.staffId] = { activeLoans: 0, totalOutstanding: 0 };
      if (l.status === "active") {
        const repaid = loanRepayments.filter(r => r.loanId === l.id).reduce((s, r) => s + r.amount, 0);
        map[l.staffId].activeLoans++;
        map[l.staffId].totalOutstanding += Math.max(0, l.amount - repaid);
      }
    });
    return map;
  }, [staffLoans, loanRepayments]);

  const openCreate = () => { setEditId(null); setForm({ ...EMPTY }); setDialogOpen(true); };

  const openEdit = (s: StaffMember) => {
    setEditId(s.id);
    setForm({ name: s.name, mobile: s.mobile, email: s.email, address: s.address, aadhaar: s.aadhaar,
      joiningDate: s.joiningDate, designation: s.designation, department: s.department,
      role: s.role, roles: effectiveRoles(s), monthlySalary: s.monthlySalary, status: s.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.mobile.trim()) { toast.error("Name and mobile are required"); return; }
    if (form.mobile.length !== 10 || !/^\d+$/.test(form.mobile)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    const dupMobile = staff.find(s => s.mobile === form.mobile && s.id !== editId);
    if (dupMobile) { toast.error("Staff with this mobile already exists"); return; }

    const roles = form.roles && form.roles.length > 0 ? form.roles : [form.role];
    const primaryRole = roles[0];
    if (editId) {
      setStaff(prev => prev.map(s => s.id === editId ? { ...s, ...form, name: form.name.trim(), role: primaryRole, roles } : s));
      toast.success("Staff details updated");
    } else {
      const newStaff: StaffMember = {
        id: generateId("STF"),
        ...form, name: form.name.trim(), role: primaryRole, roles,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setStaff(prev => [...prev, newStaff]);
      toast.success(`Staff ${newStaff.id} added`);
    }
    setDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));
    const s = staff.find(s => s.id === id);
    toast.success(`${s?.name} ${s?.status === "active" ? "disabled" : "enabled"}`);
  };

  const handleDelete = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    toast.success("Staff removed");
  };

  const viewStaff = viewId ? staff.find(s => s.id === viewId) : null;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm">{staff.length} staff members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: stats.total, icon: Users, color: "bg-blue-100 text-blue-600" },
          { label: "Active", value: stats.active, icon: UserCheck, color: "bg-green-100 text-green-600" },
          { label: "Inactive", value: stats.inactive, icon: UserX, color: "bg-slate-100 text-slate-600" },
          { label: "Monthly Payroll", value: formatCurrency(stats.totalPayroll), icon: Banknote, color: "bg-purple-100 text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color} shrink-0`}><Icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xl font-bold leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, mobile, ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={v => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(Object.entries(ROLE_META) as [UserRole, { label: string }][]).map(([role, { label }]) => (
              <SelectItem key={role} value={role}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as "all" | "active" | "inactive")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff ID</TableHead>
              <TableHead>Name & Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joining</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Loan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => {
              const perf = perfMap[s.name];
              const loan = loanMap[s.id];
              const roleMeta = ROLE_META[s.role];
              return (
                <TableRow key={s.id} className={s.status === "inactive" ? "opacity-60" : ""}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{s.mobile}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {effectiveRoles(s).map(r => (
                        <Badge key={r} className={`text-xs ${ROLE_META[r].className}`}>{ROLE_META[r].label}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{s.designation}</p>
                    <p className="text-xs text-muted-foreground">{s.department}</p>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{s.monthlySalary > 0 ? formatCurrency(s.monthlySalary) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(s.joiningDate)}</TableCell>
                  <TableCell>
                    {perf && perf.bookings > 0 ? (
                      <div className="text-xs space-y-0.5">
                        <p><span className="font-medium">{perf.bookings}</span> bookings</p>
                        <p className="text-green-600">{formatCurrency(perf.advance)} collected</p>
                        {perf.pending > 0 && <p className="text-yellow-600">{formatCurrency(perf.pending)} pending</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No bookings</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {loan && loan.activeLoans > 0 ? (
                      <div className="text-xs">
                        <p className="text-red-600 font-medium">{formatCurrency(loan.totalOutstanding)}</p>
                        <p className="text-muted-foreground">{loan.activeLoans} active</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={s.status === "active"}
                        onCheckedChange={() => toggleStatus(s.id)}
                        className="scale-75"
                      />
                      <span className={`text-xs font-medium ${s.status === "active" ? "text-green-600" : "text-slate-400"}`}>
                        {s.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewId(s.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
                            <AlertDialogDescription>Remove {s.name}? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(s.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No staff found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* View Staff Dialog */}
      {viewStaff && (
        <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                  {viewStaff.name.charAt(0)}
                </div>
                <div>
                  <p>{viewStaff.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{viewStaff.id} · {viewStaff.designation}</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Personal Info */}
              <section className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Mobile</p><p className="font-medium">{viewStaff.mobile}</p></div>
                  <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p><p className="font-medium">{viewStaff.email || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Aadhaar</p><p className="font-medium">{viewStaff.aadhaar || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Joining Date</p><p className="font-medium">{formatDate(viewStaff.joiningDate)}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Address</p><p className="font-medium">{viewStaff.address || "—"}</p></div>
                </div>
              </section>

              {/* Role & Pay */}
              <section className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Role & Compensation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Role(s)</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {effectiveRoles(viewStaff).map(r => (
                        <Badge key={r} className={`text-xs ${ROLE_META[r].className}`}>{ROLE_META[r].label}</Badge>
                      ))}
                    </div>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{viewStaff.department}</p></div>
                  <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" />Monthly Salary</p><p className="font-semibold text-base">{viewStaff.monthlySalary > 0 ? formatCurrency(viewStaff.monthlySalary) : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge className={viewStaff.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>{viewStaff.status}</Badge></div>
                </div>
              </section>

              {/* Performance */}
              {perfMap[viewStaff.name] && (
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Performance Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Bookings", value: String(perfMap[viewStaff.name].bookings) },
                      { label: "Active Trips Assigned", value: String(perfMap[viewStaff.name].activeTrips) },
                      { label: "Total Revenue", value: formatCurrency(perfMap[viewStaff.name].revenue) },
                      { label: "Advance Collected", value: formatCurrency(perfMap[viewStaff.name].advance) },
                      { label: "Pending Collection", value: formatCurrency(perfMap[viewStaff.name].pending) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-bold text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setViewId(null); navigate("/performance"); }}>
                    Full Performance Report <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* Active Loans */}
              {loanMap[viewStaff.id] && loanMap[viewStaff.id].activeLoans > 0 && (
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Outstanding Loans
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">{loanMap[viewStaff.id].activeLoans} active loan(s)</p>
                      <p className="font-bold text-red-600">{formatCurrency(loanMap[viewStaff.id].totalOutstanding)} outstanding</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setViewId(null); navigate("/staff-loans"); }}>
                      View Loans <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Staff Details" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. Rajesh Kumar Panda" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number <span className="text-red-500">*</span></Label>
              <Input value={form.mobile} onChange={e => f("mobile", e.target.value)} maxLength={10} placeholder="10-digit" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="staff@artms.in" />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar Number</Label>
              <Input value={form.aadhaar} onChange={e => f("aadhaar", e.target.value)} placeholder="XXXX-XXXX-XXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input type="date" value={form.joiningDate} onChange={e => f("joiningDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input value={form.designation} onChange={e => f("designation", e.target.value)} placeholder="e.g. Senior Executive" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => f("department", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Role(s) / Access Level</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50">
                {ALL_ROLES.map(role => {
                  const checked = (form.roles ?? [form.role]).includes(role);
                  const isLast = checked && (form.roles ?? [form.role]).length === 1;
                  return (
                    <div key={role} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={checked}
                        disabled={isLast}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <label htmlFor={`role-${role}`} className={`text-sm cursor-pointer ${isLast ? "text-muted-foreground" : ""}`}>
                        {ROLE_META[role].label}
                      </label>
                    </div>
                  );
                })}
              </div>
              {(form.roles ?? []).length > 1 && (
                <p className="text-xs text-muted-foreground">
                  Primary: <strong>{ROLE_META[form.roles![0]].label}</strong> — determines sidebar access
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Salary (₹)</Label>
              <Input type="number" value={form.monthlySalary} min={0} onChange={e => f("monthlySalary", +e.target.value)} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => f("address", e.target.value)} rows={2} placeholder="Full residential address" />
            </div>
            {editId && (
              <div className="col-span-1 sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={v => f("status", v ? "active" : "inactive")}
                />
                <div>
                  <p className="text-sm font-medium">{form.status === "active" ? "Active" : "Inactive"}</p>
                  <p className="text-xs text-muted-foreground">Toggle to enable or disable this staff account</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update Staff" : "Add Staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
