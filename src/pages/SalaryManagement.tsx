import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { SalaryRecord, PaymentMode, StaffMember } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Clock, Edit2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function SalaryManagement() {
  const { staff, setStaff, salaries, setSalaries } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salaryMonth, setSalaryMonth] = useState("June");
  const [salaryYear, setSalaryYear]   = useState(2026);
  const [salDialogOpen, setSalDialogOpen] = useState(false);
  const [editingSal, setEditingSal]   = useState<SalaryRecord | null>(null);
  const [salForm, setSalForm]         = useState({
    bonus: 0, advance: 0, deductions: 0, paymentMode: "bank_transfer" as PaymentMode,
  });

  // Active staff members
  const activeStaff = useMemo(() => staff.filter(s => s.status === "active"), [staff]);

  const monthSalaries = useMemo(() =>
    salaries.filter(s => s.month === salaryMonth && s.year === salaryYear),
    [salaries, salaryMonth, salaryYear]);

  const stats = useMemo(() => ({
    totalPayable: monthSalaries.reduce((s, r) => s + r.netSalary, 0),
    paid:    monthSalaries.filter(r => r.status === "paid").length,
    pending: monthSalaries.filter(r => r.status === "pending").length,
  }), [monthSalaries]);

  const generateMonthSalaries = () => {
    const existing = salaries.filter(s => s.month === salaryMonth && s.year === salaryYear);
    const newRecs = activeStaff
      .filter(s => !existing.find(x => x.employeeId === s.id))
      .map(s => ({
        id: generateId("SAL"),
        employeeId: s.id,
        employeeName: s.name,
        month: salaryMonth,
        year: salaryYear,
        basicSalary: s.monthlySalary,
        bonus: 0, advance: 0, deductions: 0,
        netSalary: s.monthlySalary,
        paymentMode: "bank_transfer" as PaymentMode,
        paymentDate: "",
        status: "pending" as const,
      }));
    if (newRecs.length === 0) { toast.info("Salaries already generated for this month"); return; }
    setSalaries(prev => [...prev, ...newRecs]);
    toast.success(`Generated ${newRecs.length} salary records`);
  };

  const openEditSal = (r: SalaryRecord) => {
    setEditingSal(r);
    setSalForm({ bonus: r.bonus, advance: r.advance, deductions: r.deductions, paymentMode: r.paymentMode });
    setSalDialogOpen(true);
  };

  const handleSaveSal = () => {
    if (!editingSal) return;
    const net = editingSal.basicSalary + salForm.bonus - salForm.advance - salForm.deductions;
    setSalaries(prev => prev.map(s => s.id === editingSal.id ? { ...s, ...salForm, netSalary: net } : s));
    toast.success("Salary updated");
    setSalDialogOpen(false);
  };

  const markPaid = (id: string) => {
    setSalaries(prev => prev.map(s => s.id === id
      ? { ...s, status: "paid", paymentDate: new Date().toISOString().split("T")[0] } : s
    ));
    toast.success("Marked as paid");
  };

  const markAllPaid = () => {
    setSalaries(prev => prev.map(s =>
      s.month === salaryMonth && s.year === salaryYear && s.status === "pending"
        ? { ...s, status: "paid", paymentDate: new Date().toISOString().split("T")[0] } : s
    ));
    toast.success("All salaries marked as paid");
  };

  // Lookup helper for displaying designation
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground text-sm">{activeStaff.length} active staff members</p>
        </div>
      </div>

      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll">Monthly Payroll</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4 mt-4">
          {/* Month Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={salaryMonth} onValueChange={setSalaryMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={salaryYear} onChange={e => setSalaryYear(+e.target.value)} className="w-24" />
            <Button variant="outline" onClick={generateMonthSalaries}>Generate Salaries</Button>
            {stats.pending > 0 && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={markAllPaid}>
                Mark All Paid ({stats.pending})
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Payable</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPayable)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{salaryMonth} {salaryYear} — Payroll</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto rounded-b-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Advance</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthSalaries.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{staffById.get(r.employeeId)?.designation ?? "—"}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(r.basicSalary)}</TableCell>
                      <TableCell className="text-green-600">+{formatCurrency(r.bonus)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(r.advance)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(r.deductions)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(r.netSalary)}</TableCell>
                      <TableCell className="text-xs capitalize">{r.paymentMode.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge className={r.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                          {r.status}
                        </Badge>
                        {r.status === "paid" && r.paymentDate && (
                          <p className="text-xs text-muted-foreground">{formatDate(r.paymentDate)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditSal(r)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {r.status === "pending" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => markPaid(r.id)}>
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {monthSalaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No salary records. Click "Generate Salaries" to create records for {salaryMonth} {salaryYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Staff members below are used for payroll generation. Add or edit staff in Staff Management.</p>
            <Button onClick={() => navigate("/staff")}>
              <Users className="h-4 w-4 mr-1" /> Manage Staff <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Monthly Salary</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.designation}</TableCell>
                      <TableCell className="text-sm">{s.department}</TableCell>
                      <TableCell className="text-sm">{s.mobile}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(s.monthlySalary)}</TableCell>
                      <TableCell className="text-sm">{formatDate(s.joiningDate)}</TableCell>
                      <TableCell>
                        <Badge className={s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {staff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No staff members yet. <button className="text-blue-600 underline" onClick={() => navigate("/staff")}>Add staff in Staff Management</button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Salary Dialog */}
      {editingSal && (
        <Dialog open={salDialogOpen} onOpenChange={setSalDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Salary — {editingSal.employeeName}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p>Basic: <span className="font-medium">{formatCurrency(editingSal.basicSalary)}</span></p>
                <p>Net: <span className="font-bold text-blue-700">{formatCurrency(editingSal.basicSalary + salForm.bonus - salForm.advance - salForm.deductions)}</span></p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Bonus (₹)</Label>
                  <Input type="number" value={salForm.bonus} onChange={e => setSalForm(p => ({ ...p, bonus: +e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance (₹)</Label>
                  <Input type="number" value={salForm.advance} onChange={e => setSalForm(p => ({ ...p, advance: +e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Deductions (₹)</Label>
                  <Input type="number" value={salForm.deductions} onChange={e => setSalForm(p => ({ ...p, deductions: +e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={salForm.paymentMode} onValueChange={v => setSalForm(p => ({ ...p, paymentMode: v as PaymentMode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSalDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSal}>Update Salary</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
