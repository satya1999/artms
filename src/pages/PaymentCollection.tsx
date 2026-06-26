import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId, hasRole } from "@/lib/utils";
import type { Payment, PaymentMode } from "@/types";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, CreditCard, Banknote, Smartphone, Building2, ReceiptText, Edit2, PenLine, MapPin } from "lucide-react";
import { toast } from "sonner";

const MODE_ICONS: Record<PaymentMode, React.ElementType> = {
  cash: Banknote, upi: Smartphone, bank_transfer: Building2, card: CreditCard, cheque: ReceiptText,
};

const MODE_COLORS: Record<PaymentMode, string> = {
  cash: "bg-green-100 text-green-700",
  upi: "bg-blue-100 text-blue-700",
  bank_transfer: "bg-purple-100 text-purple-700",
  card: "bg-orange-100 text-orange-700",
  cheque: "bg-slate-100 text-slate-600",
};

const EMPTY_FORM = {
  bookingId: "", amount: 0, mode: "cash" as PaymentMode, referenceNumber: "", accountName: "", notes: "",
};

export default function PaymentCollection() {
  const { payments, setPayments, bookings, setBookings, trips, bankAccounts } = useData();
  const { user } = useAuth();
  const isAdmin = hasRole(user, "super_admin");

  const [search, setSearch]         = useState("");
  const [tripFilter, setTripFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState<PaymentMode | "all">("all");

  // Collect payment dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Admin edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    amount: 0, mode: "cash" as PaymentMode, referenceNumber: "", accountName: "", notes: "",
  });

  const f  = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));
  const ef = (field: string, value: string | number) => setEditForm(prev => ({ ...prev, [field]: value }));

  const filtered = useMemo(() => payments.filter(p => {
    const matchSearch = p.passengerName.toLowerCase().includes(search.toLowerCase()) ||
      p.bookingId.toLowerCase().includes(search.toLowerCase());
    const matchTrip = tripFilter === "all" || bookings.find(b => b.id === p.bookingId)?.tripId === tripFilter;
    const matchMode = modeFilter === "all" || p.mode === modeFilter;
    return matchSearch && matchTrip && matchMode;
  }), [payments, bookings, search, tripFilter, modeFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayTotal = payments.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
    const byMode = Object.fromEntries(
      (["cash", "upi", "bank_transfer", "card", "cheque"] as PaymentMode[]).map(mode => [
        mode, payments.filter(p => p.mode === mode).reduce((s, p) => s + p.amount, 0)
      ])
    );
    return { total: payments.reduce((s, p) => s + p.amount, 0), todayTotal, byMode };
  }, [payments]);

  const selectedBooking = bookings.find(b => b.id === form.bookingId);

  const handleSave = () => {
    if (!form.bookingId || form.amount <= 0) { toast.error("Select booking and enter amount"); return; }
    if (!selectedBooking) { toast.error("Booking not found"); return; }
    if (form.amount > selectedBooking.pendingAmount) {
      toast.error(`Amount exceeds pending balance of ${formatCurrency(selectedBooking.pendingAmount)}`); return;
    }
    if (!signatureData) { toast.error("Signature is required — please sign before recording"); return; }

    const newPayment: Payment = {
      id: generateId("PAY"),
      date: new Date().toISOString().split("T")[0],
      bookingId: form.bookingId,
      passengerName: selectedBooking.passengerName,
      tripName: selectedBooking.tripName,
      amount: form.amount,
      mode: form.mode,
      referenceNumber: form.referenceNumber || undefined,
      accountName: form.accountName && form.accountName !== "none" ? form.accountName : undefined,
      notes: form.notes || undefined,
      collectedBy: user?.name || "Staff",
      signature: signatureData,
    };
    setPayments(prev => [...prev, newPayment]);

    const newAdvance = selectedBooking.advancePaid + form.amount;
    const newPending = selectedBooking.finalAmount - newAdvance;
    setBookings(prev => prev.map(b => b.id === form.bookingId ? {
      ...b,
      advancePaid: newAdvance,
      pendingAmount: newPending,
      status: newPending === 0 ? "fully_paid" : "confirmed",
    } : b));

    toast.success(`Payment of ${formatCurrency(form.amount)} recorded`);
    setForm({ ...EMPTY_FORM });
    setSignatureData(null);
    setDialogOpen(false);
  };

  const openEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditForm({
      amount: p.amount,
      mode: p.mode,
      referenceNumber: p.referenceNumber ?? "",
      accountName: p.accountName ?? "",
      notes: p.notes ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingPayment) return;
    if (editForm.amount <= 0) { toast.error("Amount must be greater than 0"); return; }

    const oldAmount = editingPayment.amount;
    const newAmount = editForm.amount;
    const amountChanged = oldAmount !== newAmount;

    // Update payment
    setPayments(prev => prev.map(p => p.id === editingPayment.id ? {
      ...p,
      amount: newAmount,
      mode: editForm.mode,
      referenceNumber: editForm.referenceNumber || undefined,
      accountName: editForm.accountName && editForm.accountName !== "none" ? editForm.accountName : undefined,
      notes: editForm.notes || undefined,
    } : p));

    // Recalculate booking balance if amount changed
    if (amountChanged) {
      const booking = bookings.find(b => b.id === editingPayment.bookingId);
      if (booking) {
        const allPayments = payments.filter(p => p.bookingId === booking.id && p.id !== editingPayment.id);
        const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0) + newAmount;
        const newPending = Math.max(0, booking.finalAmount - totalPaid);
        setBookings(prev => prev.map(b => b.id === booking.id ? {
          ...b,
          advancePaid: totalPaid,
          pendingAmount: newPending,
          status: newPending === 0 ? "fully_paid" : "confirmed",
        } : b));
      }
    }

    toast.success("Payment updated");
    setEditDialogOpen(false);
  };

  const toggleBoarded = (bookingId: string, boarded: boolean) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) { toast.error("Booking not found"); return; }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, boarded } : b));
    toast.success(boarded ? `${booking.passengerName} marked as boarded` : `${booking.passengerName} boarding cleared`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Collection</h1>
          <p className="text-muted-foreground text-sm">{payments.length} payments recorded</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setSignatureData(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Collect Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Collection</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-xl font-bold">{formatCurrency(stats.todayTotal)}</p>
          </CardContent>
        </Card>
        {(["cash", "upi", "bank_transfer"] as PaymentMode[]).map(mode => (
          <Card key={mode}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground capitalize">{mode.replace("_", " ")}</p>
              <p className="text-lg font-bold">{formatCurrency(stats.byMode[mode])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mode breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Collection by Mode</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {(["cash", "upi", "bank_transfer", "card", "cheque"] as PaymentMode[]).map(mode => {
              const Icon = MODE_ICONS[mode];
              const pct = stats.total > 0 ? ((stats.byMode[mode] / stats.total) * 100).toFixed(1) : "0.0";
              return (
                <div key={mode} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${MODE_COLORS[mode]}`}>
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="text-xs font-medium capitalize">{mode.replace("_", " ")}</p>
                    <p className="text-xs">{formatCurrency(stats.byMode[mode])} ({pct}%)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by passenger or booking..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Trips" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={v => setModeFilter(v as PaymentMode | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Ac Name</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead className="text-center">Boarding</TableHead>
                {isAdmin && <TableHead className="w-16">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const Icon = MODE_ICONS[p.mode];
                const booking = bookings.find(b => b.id === p.bookingId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{p.passengerName}</p>
                      <p className="text-xs text-muted-foreground">{p.bookingId}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[12rem]">
                      {booking?.passengerAddress
                        ? <span className="flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" />{booking.passengerAddress}</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {booking
                        ? <span>{booking.seatNumber} <span className="text-xs text-muted-foreground">({booking.seatType})</span></span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{p.tripName}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit text-xs ${MODE_COLORS[p.mode]}`}>
                        <Icon className="h-3 w-3" />
                        {p.mode.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.accountName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.referenceNumber || "—"}</TableCell>
                    <TableCell className="text-sm">{p.collectedBy}</TableCell>
                    <TableCell>
                      {p.signature
                        ? <Badge className="bg-green-100 text-green-700 text-xs gap-1"><PenLine className="h-3 w-3" /> Yes</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={!!booking?.boarded}
                        disabled={!booking}
                        onCheckedChange={(v) => toggleBoarded(p.bookingId, v === true)}
                        aria-label="Mark boarding"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 14 : 13} className="text-center py-8 text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Collect Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Booking *</Label>
              <Select value={form.bookingId} onValueChange={v => f("bookingId", v)}>
                <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.filter(b => b.pendingAmount > 0 && b.status !== "cancelled").map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.id} — {b.passengerName} — Pending: {formatCurrency(b.pendingAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBooking && (
                <div className="text-xs bg-blue-50 p-3 rounded-lg space-y-1">
                  <p><span className="text-muted-foreground">Trip:</span> {selectedBooking.tripName}</p>
                  <p><span className="text-muted-foreground">Final Amount:</span> {formatCurrency(selectedBooking.finalAmount)}</p>
                  <p><span className="text-muted-foreground">Already Paid:</span> <span className="text-green-600">{formatCurrency(selectedBooking.advancePaid)}</span></p>
                  <p><span className="text-muted-foreground">Pending Balance:</span> <span className="text-red-600 font-semibold">{formatCurrency(selectedBooking.pendingAmount)}</span></p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={e => f("amount", +e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={form.mode} onValueChange={v => f("mode", v)}>
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
              <Label>Ac Name</Label>
              <Select value={form.accountName || "none"} onValueChange={v => f("accountName", v)}>
                <SelectTrigger><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {bankAccounts.filter(a => a.active).map(a => (
                    <SelectItem key={a.id} value={`${a.bankName} — ${a.accountNumber.slice(-4)}`}>
                      {a.bankName} — ••••{a.accountNumber.slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.mode !== "cash" && (
              <div className="space-y-2">
                <Label>Reference / UTR Number</Label>
                <Input value={form.referenceNumber} onChange={e => f("referenceNumber", e.target.value)} placeholder="Transaction ID / UTR" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => f("notes", e.target.value)} placeholder="Optional notes" />
            </div>

            {/* Signature pad */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <PenLine className="h-4 w-4" />
                Collector Signature <span className="text-red-500">*</span>
              </Label>
              <SignaturePad onChange={setSignatureData} />
              {!signatureData && (
                <p className="text-xs text-amber-600">Signature required before recording payment</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!signatureData}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Dialog */}
      {isAdmin && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payment — {editingPayment?.id}</DialogTitle>
            </DialogHeader>
            {editingPayment && (
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">Passenger:</span> {editingPayment.passengerName}</p>
                  <p><span className="text-muted-foreground">Trip:</span> {editingPayment.tripName}</p>
                  <p><span className="text-muted-foreground">Collected by:</span> {editingPayment.collectedBy}</p>
                  <p><span className="text-muted-foreground">Date:</span> {formatDate(editingPayment.date)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={editForm.amount} onChange={e => ef("amount", +e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={editForm.mode} onValueChange={v => ef("mode", v)}>
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
                  <Label>Ac Name</Label>
                  <Select value={editForm.accountName || "none"} onValueChange={v => ef("accountName", v)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {bankAccounts.filter(a => a.active).map(a => (
                        <SelectItem key={a.id} value={`${a.bankName} — ${a.accountNumber.slice(-4)}`}>
                          {a.bankName} — ••••{a.accountNumber.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input value={editForm.referenceNumber} onChange={e => ef("referenceNumber", e.target.value)} placeholder="Transaction ID / UTR" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={editForm.notes} onChange={e => ef("notes", e.target.value)} />
                </div>
                {editForm.amount !== editingPayment.amount && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Amount changed: booking balance will be recalculated automatically.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
