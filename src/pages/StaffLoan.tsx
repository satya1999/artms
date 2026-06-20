import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { StaffLoan, LoanRepayment, LoanType, LoanStatus, PaymentMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Plus, Eye, CreditCard, CheckCircle2, AlertCircle, Clock,
  Banknote, Smartphone, Building2, TrendingDown, RotateCcw, Trash2, X
} from "lucide-react";
import { toast } from "sonner";

const LOAN_TYPE_META: Record<LoanType, { label: string; className: string }> = {
  loan:    { label: "Loan",            className: "bg-red-100 text-red-700" },
  advance: { label: "Salary Advance",  className: "bg-orange-100 text-orange-700" },
};

const LOAN_STATUS_META: Record<LoanStatus, { label: string; className: string; icon: React.ElementType }> = {
  active:    { label: "Active",    className: "bg-yellow-100 text-yellow-700", icon: Clock },
  closed:    { label: "Closed",    className: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  defaulted: { label: "Defaulted", className: "bg-red-100 text-red-700",     icon: AlertCircle },
};

const PAYMENT_MODES: { value: PaymentMode; label: string; icon: React.ElementType }[] = [
  { value: "cash",          label: "Cash",          icon: Banknote },
  { value: "upi",           label: "UPI",           icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
];

const EMPTY_LOAN: Omit<StaffLoan, "id" | "createdAt" | "staffName"> = {
  staffId: "", type: "advance", amount: 0, disbursedDate: new Date().toISOString().split("T")[0],
  purpose: "", repaymentMonths: 0, emiAmount: 0, status: "active", notes: "",
};

const EMPTY_REP = {
  amount: 0, mode: "cash" as PaymentMode, referenceNumber: "", notes: "", date: new Date().toISOString().split("T")[0],
};

export default function StaffLoan() {
  const { staff, staffLoans, setStaffLoans, loanRepayments, setLoanRepayments } = useData();

  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [repDialogLoanId, setRepDialogLoanId] = useState<string | null>(null);
  const [viewLoanId, setViewLoanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [loanForm, setLoanForm] = useState({ ...EMPTY_LOAN });
  const [repForm, setRepForm] = useState({ ...EMPTY_REP });

  const lf = (field: keyof typeof EMPTY_LOAN, val: string | number) =>
    setLoanForm(p => ({ ...p, [field]: val }));

  // Compute per-loan repayment totals
  const repTotals = useMemo(() => {
    const map: Record<string, number> = {};
    loanRepayments.forEach(r => { map[r.loanId] = (map[r.loanId] || 0) + r.amount; });
    return map;
  }, [loanRepayments]);

  const loansWithBalance = useMemo(() => staffLoans.map(l => ({
    ...l,
    totalRepaid: repTotals[l.id] || 0,
    outstanding: Math.max(0, l.amount - (repTotals[l.id] || 0)),
    progressPct: l.amount > 0 ? Math.min(100, Math.round(((repTotals[l.id] || 0) / l.amount) * 100)) : 0,
  })), [staffLoans, repTotals]);

  const filtered = useMemo(() => loansWithBalance.filter(l => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchStaff = staffFilter === "all" || l.staffId === staffFilter;
    return matchStatus && matchStaff;
  }), [loansWithBalance, statusFilter, staffFilter]);

  const totals = useMemo(() => ({
    disbursed: staffLoans.reduce((s, l) => s + l.amount, 0),
    repaid: Object.values(repTotals).reduce((s, v) => s + v, 0),
    outstanding: loansWithBalance.filter(l => l.status === "active").reduce((s, l) => s + l.outstanding, 0),
    activeLoans: staffLoans.filter(l => l.status === "active").length,
  }), [staffLoans, repTotals, loansWithBalance]);

  const openLoanDialog = () => { setLoanForm({ ...EMPTY_LOAN }); setLoanDialogOpen(true); };

  const handleCreateLoan = () => {
    if (!loanForm.staffId) { toast.error("Select a staff member"); return; }
    if (loanForm.amount <= 0) { toast.error("Enter a valid loan amount"); return; }
    if (!loanForm.purpose.trim()) { toast.error("Purpose is required"); return; }

    const staffMember = staff.find(s => s.id === loanForm.staffId);
    if (!staffMember) return;

    const emi = loanForm.repaymentMonths > 0 && loanForm.emiAmount === 0
      ? Math.ceil(loanForm.amount / loanForm.repaymentMonths)
      : loanForm.emiAmount;

    const newLoan: StaffLoan = {
      id: generateId("LOAN"),
      staffId: loanForm.staffId,
      staffName: staffMember.name,
      type: loanForm.type,
      amount: loanForm.amount,
      disbursedDate: loanForm.disbursedDate,
      purpose: loanForm.purpose.trim(),
      repaymentMonths: loanForm.repaymentMonths,
      emiAmount: emi,
      status: "active",
      notes: loanForm.notes || undefined,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setStaffLoans(prev => [...prev, newLoan]);
    toast.success(`${LOAN_TYPE_META[loanForm.type].label} of ${formatCurrency(loanForm.amount)} disbursed to ${staffMember.name}`);
    setLoanDialogOpen(false);
  };

  const handleRepayment = () => {
    if (!repDialogLoanId) return;
    if (repForm.amount <= 0) { toast.error("Enter a valid repayment amount"); return; }

    const loan = loansWithBalance.find(l => l.id === repDialogLoanId);
    if (!loan) return;
    if (repForm.amount > loan.outstanding) {
      toast.error(`Amount exceeds outstanding balance of ${formatCurrency(loan.outstanding)}`);
      return;
    }

    const newRep: LoanRepayment = {
      id: generateId("REP"),
      loanId: repDialogLoanId,
      staffId: loan.staffId,
      staffName: loan.staffName,
      date: repForm.date,
      amount: repForm.amount,
      mode: repForm.mode,
      referenceNumber: repForm.referenceNumber || undefined,
      notes: repForm.notes || undefined,
    };
    setLoanRepayments(prev => [...prev, newRep]);

    // Auto-close if fully repaid
    const newRepaid = loan.totalRepaid + repForm.amount;
    if (newRepaid >= loan.amount) {
      setStaffLoans(prev => prev.map(l => l.id === repDialogLoanId ? { ...l, status: "closed" } : l));
      toast.success("Repayment recorded — loan fully closed!");
    } else {
      toast.success(`Repayment of ${formatCurrency(repForm.amount)} recorded. Outstanding: ${formatCurrency(loan.outstanding - repForm.amount)}`);
    }

    setRepDialogLoanId(null);
    setRepForm({ ...EMPTY_REP });
  };

  const updateLoanStatus = (id: string, status: LoanStatus) => {
    setStaffLoans(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    toast.success(`Loan marked as ${status}`);
  };

  const deleteLoan = (id: string) => {
    setStaffLoans(prev => prev.filter(l => l.id !== id));
    setLoanRepayments(prev => prev.filter(r => r.loanId !== id));
    toast.success("Loan record deleted");
  };

  const viewLoan = viewLoanId ? loansWithBalance.find(l => l.id === viewLoanId) : null;
  const repayingLoan = repDialogLoanId ? loansWithBalance.find(l => l.id === repDialogLoanId) : null;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Loan & Advance</h1>
          <p className="text-muted-foreground text-sm">Manage loans and salary advances for staff</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openLoanDialog}>
            <Plus className="h-4 w-4 mr-1" /> New Loan / Advance
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Disbursed", value: formatCurrency(totals.disbursed), icon: TrendingDown, color: "bg-red-100 text-red-600" },
          { label: "Total Repaid", value: formatCurrency(totals.repaid), icon: CheckCircle2, color: "bg-green-100 text-green-600" },
          { label: "Outstanding Balance", value: formatCurrency(totals.outstanding), icon: AlertCircle, color: "bg-yellow-100 text-yellow-600" },
          { label: "Active Loans", value: String(totals.activeLoans), icon: Clock, color: "bg-blue-100 text-blue-600" },
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
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as LoanStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loans Table */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Loan List</TabsTrigger>
          <TabsTrigger value="repayments">All Repayments</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-3">
          <Card>
            <div className="overflow-x-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Disbursed</TableHead>
                  <TableHead>Repaid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>EMI / Plan</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => {
                  const statusMeta = LOAN_STATUS_META[l.status];
                  const typeMeta = LOAN_TYPE_META[l.type];
                  return (
                    <TableRow key={l.id}>
                      <TableCell><span className="font-mono text-xs">{l.id}</span></TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{l.staffName}</p>
                        <p className="text-xs text-muted-foreground">{staff.find(s => s.id === l.staffId)?.designation || ""}</p>
                      </TableCell>
                      <TableCell><Badge className={`text-xs ${typeMeta.className}`}>{typeMeta.label}</Badge></TableCell>
                      <TableCell className="font-semibold">{formatCurrency(l.amount)}</TableCell>
                      <TableCell className="text-xs">{formatDate(l.disbursedDate)}</TableCell>
                      <TableCell className="text-green-600 font-medium">{formatCurrency(l.totalRepaid)}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${l.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                          {l.outstanding > 0 ? formatCurrency(l.outstanding) : "Cleared"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.emiAmount > 0
                          ? <span>{formatCurrency(l.emiAmount)}/mo × {l.repaymentMonths}m</span>
                          : <span className="text-muted-foreground">No schedule</span>}
                      </TableCell>
                      <TableCell className="w-28">
                        <div className="space-y-1">
                          <Progress value={l.progressPct} className="h-1.5" />
                          <p className="text-xs text-muted-foreground text-center">{l.progressPct}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs gap-1 ${statusMeta.className}`}>
                          <statusMeta.icon className="h-3 w-3" />
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewLoanId(l.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {l.status === "active" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => { setRepDialogLoanId(l.id); setRepForm({ ...EMPTY_REP }); }}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Loan Record</AlertDialogTitle>
                                <AlertDialogDescription>Delete {l.id}? All repayment records for this loan will also be removed.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteLoan(l.id)}>Delete</AlertDialogAction>
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
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No loans found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="repayments" className="mt-3">
          <Card>
            <div className="overflow-x-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repayment ID</TableHead>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...loanRepayments]
                  .filter(r => staffFilter === "all" || r.staffId === staffFilter)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(r => (
                    <TableRow key={r.id}>
                      <TableCell><span className="font-mono text-xs">{r.id}</span></TableCell>
                      <TableCell><span className="font-mono text-xs text-muted-foreground">{r.loanId}</span></TableCell>
                      <TableCell className="font-medium text-sm">{r.staffName}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-semibold text-green-600">{formatCurrency(r.amount)}</TableCell>
                      <TableCell><span className="text-xs capitalize">{r.mode.replace(/_/g, " ")}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.referenceNumber || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                {loanRepayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No repayments recorded</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Loan Detail */}
      {viewLoan && (
        <Dialog open={!!viewLoanId} onOpenChange={() => setViewLoanId(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {viewLoan.id} — {viewLoan.staffName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {/* Summary card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-4">
                <div><p className="text-xs text-muted-foreground">Type</p><Badge className={`text-xs ${LOAN_TYPE_META[viewLoan.type].className}`}>{LOAN_TYPE_META[viewLoan.type].label}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{(() => { const sm = LOAN_STATUS_META[viewLoan.status]; const SI = sm.icon; return <Badge className={`text-xs gap-1 ${sm.className}`}><SI className="h-3 w-3" />{sm.label}</Badge>; })()}</div>
                <div><p className="text-xs text-muted-foreground">Loan Amount</p><p className="font-bold text-base">{formatCurrency(viewLoan.amount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Disbursed Date</p><p className="font-medium">{formatDate(viewLoan.disbursedDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Purpose</p><p className="font-medium">{viewLoan.purpose}</p></div>
                {viewLoan.emiAmount > 0 && (
                  <div><p className="text-xs text-muted-foreground">EMI Plan</p><p className="font-medium">{formatCurrency(viewLoan.emiAmount)}/mo × {viewLoan.repaymentMonths} months</p></div>
                )}
                {viewLoan.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{viewLoan.notes}</p></div>}
              </div>

              {/* Balance */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Repayment Progress</span>
                  <span className="text-sm">{viewLoan.progressPct}%</span>
                </div>
                <Progress value={viewLoan.progressPct} className="h-2.5" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 rounded p-2"><p className="text-xs text-muted-foreground">Loan</p><p className="font-bold">{formatCurrency(viewLoan.amount)}</p></div>
                  <div className="bg-green-50 rounded p-2"><p className="text-xs text-muted-foreground">Repaid</p><p className="font-bold text-green-600">{formatCurrency(viewLoan.totalRepaid)}</p></div>
                  <div className={`rounded p-2 ${viewLoan.outstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className={`font-bold ${viewLoan.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{viewLoan.outstanding > 0 ? formatCurrency(viewLoan.outstanding) : "Cleared"}</p>
                  </div>
                </div>
              </div>

              {/* Admin actions */}
              {viewLoan.status === "active" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setRepDialogLoanId(viewLoan.id); setRepForm({ ...EMPTY_REP }); setViewLoanId(null); }}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Record Repayment
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { updateLoanStatus(viewLoan.id, "defaulted"); setViewLoanId(null); }}>
                    Mark Defaulted
                  </Button>
                </div>
              )}

              {/* Repayment history */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Repayment History</p>
                <div className="border rounded-lg overflow-hidden">
                  {loanRepayments.filter(r => r.loanId === viewLoan.id).length === 0
                    ? <p className="text-xs text-muted-foreground p-3">No repayments yet</p>
                    : loanRepayments.filter(r => r.loanId === viewLoan.id)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map(r => (
                        <div key={r.id} className="flex justify-between items-center px-3 py-2.5 border-b last:border-0">
                          <div>
                            <p className="text-xs font-medium">{formatDate(r.date)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{r.mode.replace(/_/g, " ")}{r.referenceNumber ? ` · ${r.referenceNumber}` : ""}{r.notes ? ` — ${r.notes}` : ""}</p>
                          </div>
                          <span className="font-semibold text-sm text-green-600">{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Loan/Advance Dialog */}
      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Loan / Advance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Staff Member <span className="text-red-500">*</span></Label>
              <Select value={loanForm.staffId} onValueChange={v => lf("staffId", v)}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["loan", "advance"] as LoanType[]).map(t => (
                  <Button key={t} type="button" variant={loanForm.type === t ? "default" : "outline"} className="flex-1"
                    onClick={() => lf("type", t)}>
                    {LOAN_TYPE_META[t].label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {loanForm.type === "loan" ? "Formal loan to be repaid over several months with EMI" : "Salary advance to be deducted from upcoming salaries"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-red-500">*</span></Label>
                <Input type="number" min={1} value={loanForm.amount || ""} onChange={e => lf("amount", +e.target.value)} placeholder="e.g. 25000" />
              </div>
              <div className="space-y-1.5">
                <Label>Disbursed Date</Label>
                <Input type="date" value={loanForm.disbursedDate} onChange={e => lf("disbursedDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Repayment Months</Label>
                <Input type="number" min={0} value={loanForm.repaymentMonths || ""} placeholder="0 = flexible"
                  onChange={e => {
                    const months = +e.target.value;
                    setLoanForm(p => ({
                      ...p, repaymentMonths: months,
                      emiAmount: months > 0 && p.amount > 0 ? Math.ceil(p.amount / months) : p.emiAmount,
                    }));
                  }} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly EMI (₹)</Label>
                <Input type="number" min={0} value={loanForm.emiAmount || ""} placeholder="Auto-calculated"
                  onChange={e => lf("emiAmount", +e.target.value)} />
              </div>
            </div>

            {loanForm.amount > 0 && loanForm.repaymentMonths > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-700">Repayment Summary</p>
                <div className="flex gap-4 mt-1 text-xs text-blue-600">
                  <span>Amount: {formatCurrency(loanForm.amount)}</span>
                  <span>EMI: {formatCurrency(loanForm.emiAmount || Math.ceil(loanForm.amount / loanForm.repaymentMonths))}/month</span>
                  <span>Duration: {loanForm.repaymentMonths} months</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Purpose <span className="text-red-500">*</span></Label>
              <Input value={loanForm.purpose} onChange={e => lf("purpose", e.target.value)} placeholder="e.g. Medical emergency, house rent, education" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={loanForm.notes || ""} onChange={e => lf("notes", e.target.value)} rows={2} placeholder="Additional remarks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLoan}>Disburse {loanForm.type === "advance" ? "Advance" : "Loan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog open={!!repDialogLoanId} onOpenChange={(open) => { if (!open) setRepDialogLoanId(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-600" /> Record Repayment
            </DialogTitle>
          </DialogHeader>
          {repayingLoan && (
            <div className="space-y-4">
              {/* Loan summary */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium">{repayingLoan.staffName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Loan</span><span className="font-mono text-xs">{repayingLoan.id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-red-600">{formatCurrency(repayingLoan.outstanding)}</span></div>
                {repayingLoan.emiAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">EMI Amount</span><span>{formatCurrency(repayingLoan.emiAmount)}</span></div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Repayment Amount (₹) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} max={repayingLoan.outstanding} value={repForm.amount || ""}
                    onChange={e => setRepForm(p => ({ ...p, amount: +e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={repForm.date} onChange={e => setRepForm(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Payment Mode</Label>
                <div className="flex gap-2">
                  {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                    <Button key={value} type="button" variant={repForm.mode === value ? "default" : "outline"}
                      className="flex-1 gap-1 text-xs" size="sm"
                      onClick={() => setRepForm(p => ({ ...p, mode: value }))}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </Button>
                  ))}
                </div>
              </div>

              {repForm.mode !== "cash" && (
                <div className="space-y-1.5">
                  <Label>Reference / UTR</Label>
                  <Input value={repForm.referenceNumber} onChange={e => setRepForm(p => ({ ...p, referenceNumber: e.target.value }))} placeholder="Transaction ID" />
                </div>
              )}

              {repForm.amount > 0 && repForm.amount <= repayingLoan.outstanding && (
                <div className={`p-3 rounded-lg text-sm border ${repForm.amount >= repayingLoan.outstanding ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
                  {repForm.amount >= repayingLoan.outstanding
                    ? "This payment will fully close the loan!"
                    : `Remaining after payment: ${formatCurrency(repayingLoan.outstanding - repForm.amount)}`}
                </div>
              )}
              {repForm.amount > repayingLoan.outstanding && (
                <div className="p-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-600 flex items-center gap-2">
                  <X className="h-4 w-4" /> Amount exceeds outstanding balance
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input value={repForm.notes} onChange={e => setRepForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. May salary deduction" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepDialogLoanId(null)}>Cancel</Button>
            <Button onClick={handleRepayment} className="bg-green-600 hover:bg-green-700"
              disabled={!repForm.amount || repForm.amount > (repayingLoan?.outstanding || 0)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
