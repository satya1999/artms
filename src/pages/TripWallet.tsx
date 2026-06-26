import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatDateTime, generateId } from "@/lib/utils";
import type { TripFund, PaymentMode, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Wallet, Send, Trash2, ArrowDownCircle, ArrowUpCircle, IndianRupee, Target, Pencil, Eye, ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";

const hasTourManagerRole = (role?: UserRole, roles?: UserRole[]) =>
  role === "tour_manager" || (roles?.includes("tour_manager") ?? false);

export default function TripWallet() {
  const { trips, setTrips, staff, tripFunds, setTripFunds, expenses } = useData();
  const { user } = useAuth();

  // Login accounts — tour managers are usually created here (whose name is
  // recorded as `addedBy` on expenses), not in the staff directory.
  const users = useQuery(api.users.getAll) as Array<{ id: string; name: string; role: UserRole; roles?: UserRole[] }> | undefined;

  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [deleteFundId, setDeleteFundId] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState("all");
  const [fundForm, setFundForm] = useState({
    tripId: "", managerName: "", amount: "", mode: "cash" as PaymentMode, notes: "",
  });
  const ff = (field: string, value: string) => setFundForm((prev) => ({ ...prev, [field]: value }));

  // Budget dialog
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ tripId: "", amount: "" });

  // Wallet detail dialog
  const [detailKey, setDetailKey] = useState<{ tripId: string; managerName: string } | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  // Tour managers from both login users and the staff directory, deduped by name.
  const tourManagers = useMemo(() => {
    const byName = new Map<string, { id: string; name: string }>();
    (users ?? []).forEach(u => {
      if (hasTourManagerRole(u.role, u.roles) && !byName.has(u.name)) byName.set(u.name, { id: u.id, name: u.name });
    });
    staff.forEach(s => {
      if (hasTourManagerRole(s.role, s.roles) && !byName.has(s.name)) byName.set(s.name, { id: s.id, name: s.name });
    });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, staff]);

  // Per-trip budget vs allocated vs spent
  const tripBudgets = useMemo(() => {
    const allocByTrip = new Map<string, number>();
    tripFunds.forEach(fd => allocByTrip.set(fd.tripId, (allocByTrip.get(fd.tripId) ?? 0) + fd.amount));
    const spentByTrip = new Map<string, number>();
    expenses.forEach(e => {
      if (e.type === "trip" && e.tripId) spentByTrip.set(e.tripId, (spentByTrip.get(e.tripId) ?? 0) + e.amount);
    });
    return trips
      .map(t => {
        const budget = t.budget ?? 0;
        const allocated = allocByTrip.get(t.id) ?? 0;
        const spent = spentByTrip.get(t.id) ?? 0;
        return {
          tripId: t.id, tripName: t.tripName, budget, allocated, spent,
          remaining: budget - spent,
          usedPct: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        };
      })
      .filter(r => r.budget > 0 || r.allocated > 0 || r.spent > 0)
      .filter(r => tripFilter === "all" || r.tripId === tripFilter)
      .sort((a, b) => b.budget - a.budget);
  }, [trips, tripFunds, expenses, tripFilter]);

  const totalBudget = tripBudgets.reduce((s, r) => s + r.budget, 0);

  const openBudget = (tripId: string, current?: number) => {
    setBudgetForm({ tripId, amount: current ? String(current) : "" });
    setBudgetDialogOpen(true);
  };

  const saveBudget = () => {
    if (!budgetForm.tripId) { toast.error("Select a trip"); return; }
    const amount = Number(budgetForm.amount);
    if (!Number.isFinite(amount) || amount < 0) { toast.error("Enter a valid budget amount"); return; }
    const trip = trips.find(t => t.id === budgetForm.tripId);
    if (!trip) { toast.error("Trip not found"); return; }
    setTrips(prev => prev.map(t => t.id === budgetForm.tripId
      ? { ...t, budget: amount > 0 ? amount : undefined }
      : t));
    toast.success(amount > 0
      ? `Budget of ${formatCurrency(amount)} set for ${trip.tripName}`
      : `Budget cleared for ${trip.tripName}`);
    setBudgetDialogOpen(false);
  };

  // One wallet per (trip, manager): allocated − spent (manager's trip expenses).
  const wallets = useMemo(() => {
    const map = new Map<string, {
      tripId: string; tripName: string; managerName: string;
      allocated: number; spent: number;
    }>();
    tripFunds.forEach(fund => {
      const key = `${fund.tripId}__${fund.managerName}`;
      const w = map.get(key) ?? { tripId: fund.tripId, tripName: fund.tripName, managerName: fund.managerName, allocated: 0, spent: 0 };
      w.allocated += fund.amount;
      map.set(key, w);
    });
    expenses.forEach(e => {
      if (e.type !== "trip" || !e.tripId) return;
      const key = `${e.tripId}__${e.addedBy}`;
      const w = map.get(key);
      if (w) w.spent += e.amount;
    });
    return [...map.values()]
      .map(w => ({ ...w, remaining: w.allocated - w.spent }))
      .filter(w => tripFilter === "all" || w.tripId === tripFilter)
      .sort((a, b) => b.allocated - a.allocated);
  }, [tripFunds, expenses, tripFilter]);

  const totalAllocated = wallets.reduce((s, w) => s + w.allocated, 0);
  const totalSpent = wallets.reduce((s, w) => s + w.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  const visibleFunds = useMemo(
    () => [...tripFunds]
      .filter(fd => tripFilter === "all" || fd.tripId === tripFilter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [tripFunds, tripFilter]
  );

  const openTransfer = (prefill?: { tripId: string; managerName: string }) => {
    setFundForm({
      tripId: prefill?.tripId ?? "",
      managerName: prefill?.managerName ?? "",
      amount: "", mode: "cash", notes: "",
    });
    setFundDialogOpen(true);
  };

  // Detail for the currently open (trip, manager) wallet
  const detail = useMemo(() => {
    if (!detailKey) return null;
    const funds = tripFunds
      .filter(fd => fd.tripId === detailKey.tripId && fd.managerName === detailKey.managerName)
      .sort((a, b) => b.date.localeCompare(a.date));
    const exps = expenses
      .filter(e => e.type === "trip" && e.tripId === detailKey.tripId && e.addedBy === detailKey.managerName)
      .sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date));
    const allocated = funds.reduce((s, fd) => s + fd.amount, 0);
    const spent = exps.reduce((s, e) => s + e.amount, 0);
    const tripName = funds[0]?.tripName ?? trips.find(t => t.id === detailKey.tripId)?.tripName ?? detailKey.tripId;
    const lastFund = funds[0];
    const lastExp = exps[0];
    const lastTxnTs = [lastFund?.date, lastExp?.createdAt ?? lastExp?.date].filter(Boolean).sort().pop();
    return { funds, exps, allocated, spent, balance: allocated - spent, tripName, lastTxnTs };
  }, [detailKey, tripFunds, expenses, trips]);

  const handleTransfer = () => {
    const amount = Number(fundForm.amount);
    if (!fundForm.tripId) { toast.error("Select a trip"); return; }
    if (!fundForm.managerName) { toast.error("Select a tour manager"); return; }
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    const trip = trips.find(t => t.id === fundForm.tripId);
    if (!trip) { toast.error("Trip not found"); return; }
    const manager = tourManagers.find(m => m.name === fundForm.managerName);

    const newFund: TripFund = {
      id: generateId("FUND"),
      date: new Date().toISOString().split("T")[0],
      tripId: trip.id,
      tripName: trip.tripName,
      managerId: manager?.id,
      managerName: fundForm.managerName,
      amount,
      mode: fundForm.mode,
      transferredBy: user?.name || "Admin",
      notes: fundForm.notes.trim() || undefined,
    };
    setTripFunds(prev => [...prev, newFund]);
    toast.success(`${formatCurrency(amount)} transferred to ${fundForm.managerName}'s wallet for ${trip.tripName}`);
    setFundDialogOpen(false);
  };

  const handleDeleteFund = () => {
    if (!deleteFundId) return;
    setTripFunds(prev => prev.filter(fd => fd.id !== deleteFundId));
    toast.success("Fund transfer deleted");
    setDeleteFundId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand" /> Trip Fund Allocation
          </h1>
          <p className="text-muted-foreground text-sm">
            Send money to a tour manager for a specific trip. Their trip expenses draw down from the wallet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openBudget("")}><Target className="h-4 w-4 mr-1" /> Set Budget</Button>
          <Button onClick={() => openTransfer()}><Send className="h-4 w-4 mr-1" /> Transfer Fund</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-7 w-7 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalBudget)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="h-7 w-7 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAllocated)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDownCircle className="h-7 w-7 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUpCircle className="h-7 w-7 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Remaining in Wallets</p>
              <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totalRemaining)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip filter */}
      <div className="flex justify-end">
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All Trips" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Trip Budgets */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-amber-500" /> Trip Budgets</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Budget Left</TableHead>
                <TableHead className="w-40">Used</TableHead>
                <TableHead className="w-16 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripBudgets.map(r => {
                const over = r.budget > 0 && r.spent > r.budget;
                return (
                  <TableRow key={r.tripId}>
                    <TableCell className="text-sm font-medium">{r.tripName}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.budget > 0
                        ? <span className="text-amber-600 font-medium">{formatCurrency(r.budget)}</span>
                        : <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-blue-600">{formatCurrency(r.allocated)}</TableCell>
                    <TableCell className="text-right text-sm text-red-600">{formatCurrency(r.spent)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${r.budget === 0 ? "text-muted-foreground" : r.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.budget > 0 ? formatCurrency(r.remaining) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.budget > 0 ? (
                        <div className="space-y-1">
                          <Progress value={Math.min(100, r.usedPct)} className={`h-1.5 ${over ? "[&>div]:bg-red-500" : ""}`} />
                          <p className={`text-[11px] ${over ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            {r.usedPct}% used{over ? " · over budget" : ""}
                          </p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => openBudget(r.tripId, r.budget || undefined)} title="Set budget">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tripBudgets.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No budgets or transfers yet. Click "Set Budget" to plan a trip's spending.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Wallet balances per trip + manager */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Wallet Balances</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Tour Manager</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Balance (Live)</TableHead>
                <TableHead className="text-right w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallets.map(w => (
                <TableRow key={`${w.tripId}__${w.managerName}`}>
                  <TableCell className="text-sm font-medium">{w.tripName}</TableCell>
                  <TableCell className="text-sm">{w.managerName}</TableCell>
                  <TableCell className="text-right text-sm text-blue-600 font-medium">{formatCurrency(w.allocated)}</TableCell>
                  <TableCell className="text-right text-sm text-red-600">{formatCurrency(w.spent)}</TableCell>
                  <TableCell className={`text-right text-sm font-semibold ${w.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(w.remaining)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openTransfer({ tripId: w.tripId, managerName: w.managerName })}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Funds
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setDetailKey({ tripId: w.tripId, managerName: w.managerName })}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {wallets.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No funds transferred yet. Click "Transfer Fund" to allocate money to a tour manager.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Transfer history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Transfer History</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Tour Manager</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Transferred By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16">Del</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFunds.map(fund => (
                <TableRow key={fund.id}>
                  <TableCell className="text-sm">{formatDate(fund.date)}</TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{fund.tripName}</p>
                    {fund.notes && <p className="text-xs text-muted-foreground">{fund.notes}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{fund.managerName}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{fund.mode.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fund.transferredBy}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(fund.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteFundId(fund.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {visibleFunds.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fund transfers recorded</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Transfer Fund Dialog */}
      <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-brand" /> Transfer Fund to Trip Wallet</DialogTitle>
            <DialogDescription>Allocate money to a tour manager for a specific trip. Their trip expenses draw down from this wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Trip *</Label>
              <Select value={fundForm.tripId} onValueChange={(v) => ff("tripId", v)}>
                <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                <SelectContent>
                  {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tour Manager *</Label>
              <Select value={fundForm.managerName} onValueChange={(v) => ff("managerName", v)}>
                <SelectTrigger><SelectValue placeholder="Select tour manager" /></SelectTrigger>
                <SelectContent>
                  {tourManagers.length === 0 ? (
                    <SelectItem value="none" disabled>No tour managers found</SelectItem>
                  ) : tourManagers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min={0} value={fundForm.amount} onChange={(e) => ff("amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={fundForm.mode} onValueChange={(v) => ff("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={fundForm.notes} onChange={(e) => ff("notes", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer}><Send className="h-4 w-4 mr-1" /> Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Detail Dialog */}
      <Dialog open={!!detailKey} onOpenChange={(o) => { if (!o) setDetailKey(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-brand" /> {detail.tripName}</DialogTitle>
                <DialogDescription>{detailKey?.managerName} · Live wallet ledger</DialogDescription>
              </DialogHeader>

              {/* Snapshot */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Allocated</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(detail.allocated)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(detail.spent)}</p>
                </div>
                <div className={`rounded-lg p-3 ${detail.balance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-[11px] text-muted-foreground">Balance</p>
                  <p className={`text-lg font-bold ${detail.balance >= 0 ? "text-green-700" : "text-red-600"}`}>{formatCurrency(detail.balance)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Last transaction: {detail.lastTxnTs ? formatDateTime(detail.lastTxnTs) : "—"}
              </p>

              <div className="flex justify-end -mt-1">
                <Button size="sm" onClick={() => { const k = detailKey!; setDetailKey(null); openTransfer(k); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add More Funds
                </Button>
              </div>

              {/* Fund Transfer History */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Fund Transfer History</h3>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {detail.funds.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No transfers</p>
                  ) : detail.funds.map(fd => (
                    <div key={fd.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <p className="text-xs">{formatDate(fd.date)} · <span className="capitalize">{fd.mode.replace(/_/g, " ")}</span></p>
                        <p className="text-xs text-muted-foreground">by {fd.transferredBy}{fd.notes ? ` · ${fd.notes}` : ""}</p>
                      </div>
                      <span className="font-semibold text-green-600">+{formatCurrency(fd.amount)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Expense History */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expense History</h3>
                <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                  {detail.exps.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No expenses</p>
                  ) : detail.exps.map(e => (
                    <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate capitalize">{e.category.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDateTime(e.createdAt ?? e.date)}{e.vendorName ? ` · ${e.vendorName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {e.billUrl && (
                          <button onClick={() => setViewReceipt(e.billUrl!)} title="View receipt" className="text-muted-foreground hover:text-brand">
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                        <span className="font-semibold text-red-600">−{formatCurrency(e.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt lightbox */}
      <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {viewReceipt && <img src={viewReceipt} alt="Receipt" className="w-full object-contain max-h-[70vh] rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Set Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-amber-500" /> Set Trip Budget</DialogTitle>
            <DialogDescription>Plan the total expense budget for a trip. Spending is tracked against it. Set to 0 to clear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Trip *</Label>
              <Select value={budgetForm.tripId} onValueChange={(v) => setBudgetForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                <SelectContent>
                  {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}{t.budget ? ` · ${formatCurrency(t.budget)}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget Amount (₹)</Label>
              <Input type="number" min={0} value={budgetForm.amount} onChange={(e) => setBudgetForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBudget}><Target className="h-4 w-4 mr-1" /> Save Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Fund */}
      <Dialog open={!!deleteFundId} onOpenChange={() => setDeleteFundId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Fund Transfer?</DialogTitle>
            <DialogDescription>This reduces the manager's wallet allocation. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFundId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFund}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
