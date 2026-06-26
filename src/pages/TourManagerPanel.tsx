import { useState, useMemo, useRef } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatDateTime, generateId, compressImage } from "@/lib/utils";
import type { Expense, TripExpenseCategory, PaymentMode, TripStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Receipt, Wallet, Bus, MapPin, ArrowDownCircle, ArrowUpCircle,
  Trash2, ImageIcon, Camera, X, Loader2, IndianRupee, User,
} from "lucide-react";
import { toast } from "sonner";

// ── Categories (Tour Manager quick entry) ──────────────────────────────────────
const TM_CATEGORIES: { value: TripExpenseCategory; label: string; emoji: string }[] = [
  { value: "food_catering",       label: "Food & Catering",      emoji: "🍽️" },
  { value: "hotel_accommodation", label: "Hotel & Accommodation", emoji: "🏨" },
  { value: "fuel",                label: "Fuel",                  emoji: "⛽" },
  { value: "toll",                label: "Toll",                  emoji: "🛣️" },
  { value: "parking",             label: "Parking",               emoji: "🅿️" },
  { value: "driver_allowance",    label: "Driver Allowance",      emoji: "🧑‍✈️" },
  { value: "local_transport",     label: "Local Transport",       emoji: "🚖" },
  { value: "entry_fees",          label: "Temple/Entry Fees",     emoji: "🛕" },
  { value: "emergency",           label: "Emergency Expenses",    emoji: "🚨" },
  { value: "miscellaneous",       label: "Miscellaneous",         emoji: "🧾" },
];

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank" },
];

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const categoryLabel = (c: string) =>
  TM_CATEGORIES.find(x => x.value === c)?.label ?? c.replace(/_/g, " ");

const EMPTY_FORM = {
  category: "food_catering" as TripExpenseCategory,
  amount: "",
  paymentMode: "cash" as PaymentMode,
  vendorName: "",
  notes: "",
};

export default function TourManagerPanel() {
  const { trips, expenses, setExpenses, tripFunds } = useData();
  const { user } = useAuth();

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [receipt, setReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fld = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // ── Derived data ─────────────────────────────────────────────────────────────
  const availableTrips = useMemo(
    () => trips.filter(t => ["published", "active", "completed"].includes(t.status))
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [trips]
  );
  const selectedTrip = availableTrips.find(t => t.id === selectedTripId);

  const myTripFunds = useMemo(
    () => selectedTripId
      ? tripFunds
          .filter(fd => fd.tripId === selectedTripId && fd.managerName === user?.name)
          .sort((a, b) => b.date.localeCompare(a.date))
      : [],
    [tripFunds, selectedTripId, user]
  );

  const myTripExpenses = useMemo(
    () => selectedTripId
      ? expenses
          .filter(e => e.type === "trip" && e.tripId === selectedTripId && e.addedBy === user?.name)
          .sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date))
      : [],
    [expenses, selectedTripId, user]
  );

  const wallet = useMemo(() => {
    const received = myTripFunds.reduce((s, fd) => s + fd.amount, 0);
    const spent = myTripExpenses.reduce((s, e) => s + e.amount, 0);
    return { received, spent, balance: received - spent };
  }, [myTripFunds, myTripExpenses]);

  // Combined transaction feed (credits = funds in, debits = expenses out)
  const transactions = useMemo(() => {
    const credits = myTripFunds.map(fd => ({
      id: fd.id,
      ts: fd.date,
      tsLabel: formatDate(fd.date),
      kind: "credit" as const,
      title: "Funds received from admin",
      subtitle: `${fd.mode.replace(/_/g, " ")} · by ${fd.transferredBy}`,
      amount: fd.amount,
      receipt: undefined as string | undefined,
    }));
    const debits = myTripExpenses.map(e => ({
      id: e.id,
      ts: e.createdAt ?? e.date,
      tsLabel: formatDateTime(e.createdAt ?? e.date),
      kind: "debit" as const,
      title: categoryLabel(e.category),
      subtitle: e.vendorName || "",
      amount: e.amount,
      receipt: e.billUrl,
    }));
    return [...credits, ...debits].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [myTripFunds, myTripExpenses]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image too large (max 10 MB)"); return; }
    try {
      setUploading(true);
      setReceipt(await compressImage(file));
    } catch {
      toast.error("Could not process image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setReceipt(null); };

  const openExpense = () => {
    if (!selectedTrip) { toast.error("Select a trip first"); return; }
    resetForm();
    setExpenseOpen(true);
  };

  const saveExpense = () => {
    if (!selectedTrip) { toast.error("Select a trip first"); return; }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > wallet.balance) {
      toast.error(`Exceeds wallet balance of ${formatCurrency(wallet.balance)}. Ask admin to add funds.`);
      return;
    }
    setSaving(true);
    const newExp: Expense = {
      id: generateId("EXP"),
      date: new Date().toISOString().split("T")[0],
      type: "trip",
      tripId: selectedTrip.id,
      tripName: selectedTrip.tripName,
      category: form.category,
      description: TM_CATEGORIES.find(c => c.value === form.category)?.label ?? form.category,
      amount,
      vendorName: form.vendorName.trim() || undefined,
      billUrl: receipt || undefined,
      paymentMode: form.paymentMode,
      addedBy: user?.name || "Tour Manager",
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [...prev, newExp]);
    toast.success(`${formatCurrency(amount)} expense recorded · balance ${formatCurrency(wallet.balance - amount)}`);
    resetForm();
    setSaving(false);
    setExpenseOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setExpenses(prev => prev.filter(e => e.id !== deleteId));
    toast.success("Expense deleted — wallet refunded");
    setDeleteId(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-brand" /> Tour Manager
        </h1>
        <p className="text-muted-foreground text-sm">Record trip expenses & manage your trip wallet</p>
      </div>

      {/* Trip Selector */}
      <Card className="border-2 border-dashed border-brand/30 bg-gradient-to-r from-brand/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground shrink-0">
              <Bus className="h-4 w-4 text-brand" /> Select Trip:
            </div>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="flex-1 bg-white"><SelectValue placeholder="Choose a trip to manage..." /></SelectTrigger>
              <SelectContent>
                {availableTrips.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-medium">{t.tripName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{formatDate(t.startDate)} — {t.destination}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedTrip ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Select a trip to get started</p>
            <p className="text-sm">Choose a trip above to manage its wallet and expenses.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview: trip + manager + status */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-base">{selectedTrip.tripName}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" /> {user?.name}</span>
            <Badge className={TRIP_STATUS_COLORS[selectedTrip.status]}>{selectedTrip.status.replace(/_/g, " ")}</Badge>
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedTrip.departurePoint} → {selectedTrip.destination}</span>
          </div>

          {/* Large Wallet Balance card */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="relative bg-gradient-to-br from-brand to-brand-dark text-white">
              <Wallet className="absolute -right-6 -top-6 h-32 w-32 text-white/10 rotate-12" />
              <div className="relative p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">Current Trip Wallet Balance</p>
                <p className="text-5xl font-black leading-none mt-1">{formatCurrency(wallet.balance)}</p>
                <p className="text-sm text-white/90 mt-2">
                  {wallet.balance <= 0
                    ? "Wallet empty — ask admin to transfer funds"
                    : `${myTripFunds.length} transfer(s) · ${myTripExpenses.length} expense(s)`}
                </p>
              </div>
            </div>
            <CardContent className="grid grid-cols-3 divide-x p-0">
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><ArrowUpCircle className="h-3 w-3 text-green-600" /> Funds Received</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(wallet.received)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><ArrowDownCircle className="h-3 w-3 text-red-500" /> Total Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(wallet.spent)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><Wallet className="h-3 w-3 text-brand" /> Remaining</p>
                <p className={`text-lg font-bold ${wallet.balance >= 0 ? "text-green-700" : "text-red-600"}`}>{formatCurrency(wallet.balance)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Add Expense — card with + button */}
          <Card
            onClick={() => { if (wallet.balance > 0) openExpense(); }}
            className={`border-2 border-dashed transition-colors ${
              wallet.balance > 0
                ? "border-brand/40 hover:border-brand hover:bg-brand/5 cursor-pointer"
                : "border-slate-200 opacity-70"
            }`}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-white ${wallet.balance > 0 ? "bg-brand" : "bg-slate-300"}`}>
                <Plus className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base">Add Expense</p>
                <p className="text-xs text-muted-foreground">
                  {wallet.balance > 0
                    ? "Tap to record a trip expense from your wallet"
                    : "Wallet is empty — ask admin to transfer funds first"}
                </p>
              </div>
              <Button
                size="icon"
                className="ml-auto shrink-0 rounded-full h-10 w-10"
                disabled={wallet.balance <= 0}
                onClick={(e) => { e.stopPropagation(); openExpense(); }}
                aria-label="Add expense"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-brand" /> Recent Transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Receipt className="h-9 w-9 mx-auto mb-2 opacity-30" />
                  No transactions yet
                </div>
              ) : (
                <div className="divide-y">
                  {transactions.slice(0, 10).map(t => (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.kind === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {t.kind === "credit" ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.subtitle}{t.subtitle ? " · " : ""}{t.tsLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.receipt && (
                          <button onClick={() => setViewReceipt(t.receipt!)} title="View receipt" className="text-muted-foreground hover:text-brand">
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                        <span className={`font-semibold text-sm ${t.kind === "credit" ? "text-green-600" : "text-red-600"}`}>
                          {t.kind === "credit" ? "+" : "−"}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense History */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Expense History ({myTripExpenses.length})</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12">Del</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTripExpenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(e.createdAt ?? e.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{categoryLabel(e.category)}</Badge>
                        {e.notes && <p className="text-xs text-muted-foreground mt-0.5">{e.notes}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.vendorName || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{e.paymentMode.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        {e.billUrl
                          ? <button onClick={() => setViewReceipt(e.billUrl!)} className="text-brand hover:underline text-xs flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> View</button>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {myTripExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" /> No expenses recorded for this trip yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-red-500" /> Add Expense</DialogTitle>
            <DialogDescription>
              {selectedTrip?.tripName} · Wallet balance:{" "}
              <span className={`font-semibold ${wallet.balance > 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(wallet.balance)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category chips */}
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {TM_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => fld("category", c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.category === c.value
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand/50"
                    }`}
                  >
                    <span className="mr-1">{c.emoji}</span>{c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount — big and primary */}
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number" min={0} inputMode="numeric" autoFocus
                  className="pl-10 h-14 text-2xl font-bold"
                  value={form.amount}
                  onChange={e => fld("amount", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={v => fld("paymentMode", v as PaymentMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vendor Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={form.vendorName} onChange={e => fld("vendorName", e.target.value)} placeholder="e.g. Hotel Surya" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.notes} onChange={e => fld("notes", e.target.value)} placeholder="Any detail" />
            </div>

            {/* Receipt upload */}
            <div className="space-y-1.5">
              <Label>Bill / Receipt <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {receipt ? (
                <div className="relative inline-block">
                  <img src={receipt} alt="Receipt" className="h-24 rounded-lg border object-cover cursor-pointer" onClick={() => setViewReceipt(receipt)} />
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow"
                    aria-label="Remove receipt"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                  {uploading ? "Processing…" : "Upload Bill/Receipt"}
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onReceipt} />
            </div>

            <p className="text-xs text-muted-foreground">
              Wallet after this:{" "}
              <span className={`font-semibold ${wallet.balance - (Number(form.amount) || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(wallet.balance - (Number(form.amount) || 0))}
              </span>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={saving || !form.amount}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Add Expense button (mobile-friendly quick access) */}
      {selectedTrip && wallet.balance > 0 && (
        <button
          onClick={openExpense}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center hover:bg-brand-dark transition-colors sm:hidden"
          aria-label="Add expense"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {/* Receipt lightbox */}
      <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {viewReceipt && <img src={viewReceipt} alt="Receipt" className="w-full object-contain max-h-[70vh] rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense?</DialogTitle>
            <DialogDescription>The amount will be refunded to the trip wallet. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
