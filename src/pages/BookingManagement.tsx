import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, hasRole } from "@/lib/utils";
import type { Booking, BookingStatus, PaymentProofStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Search, Eye, CheckCircle2, XCircle, Clock,
  Phone, MapPin, CreditCard, User, ImageIcon
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<BookingStatus, string> = {
  tentative: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  balance_due: "bg-yellow-100 text-yellow-700",
  fully_paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  no_show: "bg-orange-100 text-orange-700",
  waitlisted: "bg-purple-100 text-purple-700",
};

const PROOF_CONFIG: Record<PaymentProofStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700", icon: XCircle },
};

export default function BookingManagement() {
  const { bookings, setBookings, trips, payments } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = hasRole(user, "super_admin", "accountant");

  const [search, setSearch] = useState("");
  const [tripFilter, setTripFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [proofFilter, setProofFilter] = useState<PaymentProofStatus | "all">("all");
  const [viewId, setViewId] = useState<string | null>(null);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const stats = useMemo(() => ({
    total: bookings.filter(b => b.status !== "cancelled").length,
    fullyPaid: bookings.filter(b => b.status === "fully_paid").length,
    pending: bookings.filter(b => b.pendingAmount > 0 && b.status !== "cancelled").length,
    pendingAmount: bookings.reduce((s, b) => s + (b.status !== "cancelled" ? b.pendingAmount : 0), 0),
    proofPending: bookings.filter(b => b.paymentProofStatus === "pending").length,
  }), [bookings]);

  const filtered = useMemo(() => {
    return bookings
      .filter(b => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          b.passengerName.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.passengerMobile?.includes(q) ||
          b.seatNumber.toLowerCase().includes(q);
        const matchTrip = tripFilter === "all" || b.tripId === tripFilter;
        const matchStatus = statusFilter === "all" || b.status === statusFilter;
        const matchProof = proofFilter === "all" || b.paymentProofStatus === proofFilter;
        return matchSearch && matchTrip && matchStatus && matchProof;
      })
      .sort((a, b) => b.bookingDateTime.localeCompare(a.bookingDateTime));
  }, [bookings, search, tripFilter, statusFilter, proofFilter]);

  const viewBooking = viewId ? bookings.find(b => b.id === viewId) : null;

  const updateProofStatus = (id: string, status: PaymentProofStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofStatus: status } : b));
    toast.success(`Payment proof ${status}`);
    // Update viewBooking reference — keep dialog open
  };

  const updateBookingStatus = (id: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    toast.success("Booking status updated");
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Bookings</h1>
          <p className="text-muted-foreground text-sm">{bookings.length} total bookings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/book")}>
            <Plus className="h-4 w-4 mr-1" /> New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Active", value: stats.total, color: "text-foreground" },
          { label: "Fully Paid", value: stats.fullyPaid, color: "text-green-600" },
          { label: "Balance Pending", value: stats.pending, color: "text-yellow-600" },
          { label: "Pending ₹", value: formatCurrency(stats.pendingAmount), color: "text-red-600" },
          { label: "Proof Pending", value: stats.proofPending, color: "text-orange-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, ID, mobile, seat..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Trips" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as BookingStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_COLORS) as BookingStatus[]).map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={proofFilter} onValueChange={v => setProofFilter(v as PaymentProofStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Proof Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Proofs</SelectItem>
            <SelectItem value="pending">Proof Pending</SelectItem>
            <SelectItem value="approved">Proof Approved</SelectItem>
            <SelectItem value="rejected">Proof Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Trip / Seat</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Final Amt</TableHead>
                <TableHead>Advance</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => {
                const proofCfg = b.paymentProofStatus ? PROOF_CONFIG[b.paymentProofStatus] : null;
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-mono text-xs">{b.id}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.bookingDate)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{b.passengerName}</p>
                      {b.passengerAddress && <p className="text-xs text-muted-foreground truncate max-w-32">{b.passengerAddress}</p>}
                      {b.passengerAadhaar && <p className="text-xs text-muted-foreground">{b.passengerAadhaar}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{b.passengerMobile}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{b.passengerAge ?? "—"} / {b.passengerGender ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{b.tripName}</p>
                      <p className="text-xs text-muted-foreground">Seat {b.seatNumber} ({b.seatType})</p>
                    </TableCell>
                    <TableCell className="text-xs">{formatCurrency(b.packageAmount)}</TableCell>
                    <TableCell>
                      {b.discount > 0
                        ? <span className="text-xs text-red-600">- {formatCurrency(b.discount)}</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(b.finalAmount)}</TableCell>
                    <TableCell className="text-green-600 font-medium text-sm">{formatCurrency(b.advancePaid)}</TableCell>
                    <TableCell>
                      {b.pendingAmount > 0
                        ? <span className="text-red-600 font-medium text-sm">{formatCurrency(b.pendingAmount)}</span>
                        : <span className="text-green-600 text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      {proofCfg ? (
                        <Badge className={`text-xs gap-1 ${proofCfg.className}`}>
                          <proofCfg.icon className="h-3 w-3" />
                          {proofCfg.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No proof</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[b.status]}`}>{b.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewId(b.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* View Booking Dialog */}
      {viewBooking && (
        <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-base">{viewBooking.id}</span>
                <Badge className={STATUS_COLORS[viewBooking.status]}>{viewBooking.status.replace(/_/g, " ")}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Passenger */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Passenger Information
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{viewBooking.passengerName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Mobile</p><p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{viewBooking.passengerMobile}</p></div>
                  <div><p className="text-xs text-muted-foreground">Age</p><p className="font-medium">{viewBooking.passengerAge ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Gender</p><p className="font-medium">{viewBooking.passengerGender ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Aadhaar</p><p className="font-medium">{viewBooking.passengerAadhaar || "—"}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Address</p><p className="font-medium">{viewBooking.passengerAddress || "—"}</p></div>
                </div>
              </section>

              {/* Trip & Seat */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trip & Seat</h3>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Trip</p><p className="font-medium">{viewBooking.tripName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Seat</p><p className="font-medium">{viewBooking.seatNumber} ({viewBooking.seatType})</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium capitalize">{viewBooking.source.replace(/_/g, " ")}</p></div>
                  <div><p className="text-xs text-muted-foreground">Booking Date</p><p className="font-medium">{formatDate(viewBooking.bookingDate)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Booking Time</p><p className="font-medium">{new Date(viewBooking.bookingDateTime).toLocaleTimeString("en-IN")}</p></div>
                </div>
              </section>

              {/* Financials */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Financial Details
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Package Amount</span><span>{formatCurrency(viewBooking.packageAmount)}</span></div>
                  {viewBooking.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount {viewBooking.discountReason ? `(${viewBooking.discountReason})` : ""}</span>
                      <span>- {formatCurrency(viewBooking.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5">
                    <span>Final Amount</span><span className="text-base">{formatCurrency(viewBooking.finalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Advance Paid ({viewBooking.paymentMode?.replace(/_/g, " ") ?? "—"})</span>
                    <span>{formatCurrency(viewBooking.advancePaid)}</span>
                  </div>
                  {viewBooking.paymentReferenceNumber && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Reference</span><span>{viewBooking.paymentReferenceNumber}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-semibold ${viewBooking.pendingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                    <span>Remaining Balance</span><span>{formatCurrency(viewBooking.pendingAmount)}</span>
                  </div>
                </div>
              </section>

              {/* Staff info */}
              <section className="bg-blue-50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Staff Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-muted-foreground">Collected By</p><p className="font-medium">{viewBooking.collectedBy}</p></div>
                  <div><p className="text-muted-foreground">Staff ID</p><p className="font-medium">{viewBooking.staffId || "—"}</p></div>
                </div>
              </section>

              {/* Payment Proof */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Payment Proof Verification
                </h3>
                {viewBooking.paymentScreenshot ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={viewBooking.paymentScreenshot} alt="Payment proof"
                      className="w-full max-h-48 object-contain cursor-pointer"
                      onClick={() => setScreenshotOpen(true)}
                    />
                    <div className="p-3 bg-slate-50 border-t flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        {viewBooking.paymentProofStatus && (
                          <Badge className={`text-xs ${PROOF_CONFIG[viewBooking.paymentProofStatus].className}`}>
                            {PROOF_CONFIG[viewBooking.paymentProofStatus].label}
                          </Badge>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs h-7 text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => updateProofStatus(viewBooking.id, "approved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => updateProofStatus(viewBooking.id, "rejected")}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3">No payment screenshot uploaded.</p>
                )}
              </section>

              {/* Booking Status change (admin only) */}
              {isAdmin && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Booking Status</h3>
                  <Select value={viewBooking.status} onValueChange={v => updateBookingStatus(viewBooking.id, v as BookingStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_COLORS) as BookingStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>
              )}

              {/* Payment history */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h3>
                <div className="border rounded-lg overflow-hidden">
                  {payments.filter(p => p.bookingId === viewBooking.id).length === 0
                    ? <p className="text-xs text-muted-foreground p-3">No payment records</p>
                    : payments.filter(p => p.bookingId === viewBooking.id).map(p => (
                      <div key={p.id} className="flex justify-between items-center px-3 py-2 border-b last:border-0 text-xs">
                        <div>
                          <span className="font-medium">{formatDate(p.date)}</span>
                          <span className="text-muted-foreground ml-2 capitalize">{p.mode.replace(/_/g, " ")}</span>
                          {p.referenceNumber && <span className="text-muted-foreground ml-1">· {p.referenceNumber}</span>}
                        </div>
                        <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Full-size screenshot lightbox */}
      {screenshotOpen && viewBooking?.paymentScreenshot && (
        <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
            <img src={viewBooking.paymentScreenshot} alt="Payment proof" className="w-full object-contain max-h-[70vh] rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
