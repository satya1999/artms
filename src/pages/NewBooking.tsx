import { useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId, hasRole } from "@/lib/utils";
import type { Booking, BookingStatus, PaymentMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bus, User, CreditCard, CheckCircle2, ChevronRight, MapPin,
  Calendar, Banknote, Smartphone, Building2, AlertCircle, Printer,
  Upload, X, ImageIcon, Phone, Download, IndianRupee, Clock,
  Shield, Bookmark, Users, Plus,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Select Trip", "Passenger & Seat", "Payment"] as const;
type Step = 0 | 1 | 2;

const PAYMENT_MODES: { value: PaymentMode; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
];

const GENDERS = ["Male", "Female", "Other"] as const;

const EMPTY_PASSENGER = {
  name: "", mobile: "", address: "", aadhaar: "",
  age: "" as string | number, gender: "Male" as "Male" | "Female" | "Other",
};

const EMPTY_PAYMENT = {
  mode: "cash" as PaymentMode,
  referenceNumber: "",
  advancePaid: 0,
  screenshot: "" as string,
  notes: "",
};

export default function NewBooking() {
  const { trips, bookings, setBookings, setPayments, coinsPerBooking } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(0);
  const [selectedTripId, setSelectedTripId] = useState<string>((location.state as { tripId?: string } | null)?.tripId || "");
  const [seatNumber, setSeatNumber] = useState("");
  const [seatType, setSeatType] = useState<"seat" | "sleeper">("seat");
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [passenger, setPassenger] = useState({ ...EMPTY_PASSENGER });
  const [payment, setPayment] = useState({ ...EMPTY_PAYMENT });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const publishedTrips = trips.filter(t => t.status === "published" || t.status === "active");

  const packageAmount = selectedTrip
    ? (seatType === "sleeper" ? selectedTrip.sleeperPrice : selectedTrip.seatPrice)
    : 0;
  const finalAmount = Math.max(0, packageAmount - discount);
  const pendingAmount = Math.max(0, finalAmount - payment.advancePaid);
  const advanceExceedsTotal = payment.advancePaid > finalAmount;

  // When trip changes auto-set seat type to seat (reset sleeper if trip has none)
  const selectTrip = (id: string) => {
    setSelectedTripId(id);
    const t = trips.find(tt => tt.id === id);
    if (t && t.sleeperSeats === 0) setSeatType("seat");
  };

  const setP = (field: keyof typeof EMPTY_PASSENGER, val: string | number) =>
    setPassenger(p => ({ ...p, [field]: val }));

  // Screenshot: convert file to base64
  const handleScreenshot = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPayment(p => ({ ...p, screenshot: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const clearScreenshot = () => {
    setPayment(p => ({ ...p, screenshot: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canNext = (): boolean => {
    if (step === 0) return !!selectedTripId;
    if (step === 1) return !!(passenger.name.trim() && passenger.mobile.trim() && seatNumber.trim());
    if (step === 2) return !advanceExceedsTotal;
    return true;
  };

  const handleConfirm = () => {
    if (!selectedTrip) return;

    // Guard: no seats remaining on this trip
    if (availableSeats <= 0) {
      toast.error("This trip is full — no seats available");
      return;
    }
    // Guard: seat number already taken on this trip
    const seatTaken = bookings.some(
      b => b.tripId === selectedTrip.id && b.status !== "cancelled" &&
        b.seatNumber.trim().toLowerCase() === seatNumber.trim().toLowerCase()
    );
    if (seatTaken) {
      toast.error(`Seat "${seatNumber}" is already booked on this trip`);
      return;
    }

    const now = new Date();
    const bookingDateTime = now.toISOString();
    const bookingDate = now.toISOString().split("T")[0];

    const autoStatus: BookingStatus =
      payment.advancePaid >= finalAmount ? "fully_paid"
        : payment.advancePaid > 0 ? "confirmed"
          : "tentative";

    // Collision-safe booking ID: take the highest existing sequence for this
    // year and increment, then guarantee global uniqueness. Using array length
    // would re-issue an existing ID after any cancellation/deletion.
    const yearPrefix = `AR-${now.getFullYear()}-`;
    const existingIds = new Set(bookings.map(b => b.id));
    const maxSeq = bookings
      .filter(b => b.id.startsWith(yearPrefix))
      .reduce((m, b) => {
        const n = parseInt(b.id.slice(yearPrefix.length), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
    let seq = maxSeq + 1;
    let bookingId = `${yearPrefix}${String(seq).padStart(4, "0")}`;
    while (existingIds.has(bookingId)) {
      seq++;
      bookingId = `${yearPrefix}${String(seq).padStart(4, "0")}`;
    }

    const newBooking: Booking = {
      id: bookingId,
      bookingDate,
      bookingDateTime,
      passengerName: passenger.name.trim(),
      passengerMobile: passenger.mobile.trim(),
      passengerAddress: passenger.address.trim() || undefined,
      passengerAadhaar: passenger.aadhaar.trim() || undefined,
      passengerAge: passenger.age !== "" ? Number(passenger.age) : undefined,
      passengerGender: passenger.gender,
      tripId: selectedTrip.id,
      tripName: selectedTrip.tripName,
      seatNumber,
      seatType,
      packageAmount,
      discount,
      discountReason: discountReason.trim() || undefined,
      finalAmount,
      advancePaid: payment.advancePaid,
      pendingAmount,
      status: autoStatus,
      source: "walk_in",
      collectedBy: user?.name || "Staff",
      staffId: user?.id,
      notes: payment.notes.trim() || undefined,
      paymentMode: payment.mode,
      paymentReferenceNumber: payment.referenceNumber.trim() || undefined,
      paymentScreenshot: payment.screenshot || undefined,
      paymentProofStatus: payment.screenshot ? "pending" : undefined,
      rewardCoins: coinsPerBooking > 0 ? coinsPerBooking : undefined,
    };

    setBookings(prev => [...prev, newBooking]);

    if (payment.advancePaid > 0) {
      setPayments(prev => [...prev, {
        id: generateId("PAY"),
        date: bookingDate,
        bookingId,
        passengerName: passenger.name.trim(),
        tripName: selectedTrip.tripName,
        amount: payment.advancePaid,
        mode: payment.mode,
        referenceNumber: payment.referenceNumber.trim() || undefined,
        collectedBy: user?.name || "Staff",
      }]);
    }

    setSavedBooking(newBooking);
    setReceiptOpen(true);
    toast.success(`Booking ${bookingId} created!`);
  };

  const resetForm = () => {
    setStep(0); setSelectedTripId(""); setSeatNumber(""); setSeatType("seat");
    setDiscount(0); setDiscountReason("");
    setPassenger({ ...EMPTY_PASSENGER }); setPayment({ ...EMPTY_PAYMENT });
    setSavedBooking(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const bookedSeats = bookings.filter(b => b.tripId === selectedTripId && b.status !== "cancelled").length;
  const availableSeats = selectedTrip ? selectedTrip.totalSeats - bookedSeats : 0;

  // ── Receipt helpers ──────────────────────────────────────────────────────────

  const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  const openPrintWindow = () => {
    if (!receiptRef.current || !savedBooking) return;
    const win = window.open("", "_blank", "width=650,height=950");
    if (!win) { toast.error("Allow popups to print / download"); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Receipt — ${savedBooking.id}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @media print { @page { size: A4 portrait; margin: 8mm; } }
    body { margin: 0; background: white; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>${receiptRef.current.outerHTML}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),900));<\/script>
</body></html>`);
    win.document.close();
  };

  const shareOnWhatsApp = () => {
    if (!savedBooking) return;
    const lines = [
      `✅ *Booking Confirmed!*`,
      ``,
      `🎫 *Booking ID:* ${savedBooking.id}`,
      `🚌 *Trip:* ${savedBooking.tripName}`,
      `👤 *Passenger:* ${savedBooking.passengerName}`,
      `📞 *Contact:* ${savedBooking.passengerMobile}`,
      `💺 *Seat:* ${savedBooking.seatNumber} (${savedBooking.seatType})`,
      `📅 *Date:* ${new Date(savedBooking.bookingDateTime).toLocaleString("en-IN")}`,
      ``,
      `💰 *Payment Details:*`,
      `Package Amount: ₹${savedBooking.packageAmount.toLocaleString("en-IN")}`,
      savedBooking.discount > 0 ? `Discount: -₹${savedBooking.discount.toLocaleString("en-IN")}` : "",
      `Advance Paid: ₹${savedBooking.advancePaid.toLocaleString("en-IN")}`,
      `Balance Due: ₹${savedBooking.pendingAmount.toLocaleString("en-IN")}`,
      ``,
      `Thank you for traveling with *Ananda Rath Voyages* 🙏`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Booking</h1>
        <p className="text-muted-foreground text-sm">Booked by {user?.name} · {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${i <= step ? "text-blue-600" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${i < step ? "bg-blue-600 border-blue-600 text-white" : i === step ? "border-blue-600 text-blue-600" : "border-slate-300"}`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-blue-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Select Trip ── */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Bus className="h-4 w-4" /> Select a Trip</h2>
          {publishedTrips.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No trips published yet. Ask admin to publish a trip.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {publishedTrips.map(trip => {
                const b = bookings.filter(bk => bk.tripId === trip.id && bk.status !== "cancelled").length;
                const avail = trip.totalSeats - b;
                const sel = selectedTripId === trip.id;
                return (
                  <Card
                    key={trip.id}
                    onClick={() => selectTrip(trip.id)}
                    className={`cursor-pointer transition-all ${sel ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"} ${avail === 0 ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{trip.tripName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.departurePoint} → {trip.destination}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={avail === 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                          {avail === 0 ? "Full" : `${avail} left`}
                        </Badge>
                        <p className="text-sm font-semibold mt-1">{formatCurrency(trip.seatPrice)}</p>
                        {trip.sleeperSeats > 0 && <p className="text-xs text-muted-foreground">Sleeper {formatCurrency(trip.sleeperPrice)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Passenger & Seat ── */}
      {step === 1 && selectedTrip && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Passenger Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={passenger.name} onChange={e => setP("name", e.target.value)} placeholder="e.g. Sita Devi Mohanty" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Number <span className="text-red-500">*</span></Label>
              <Input value={passenger.mobile} onChange={e => setP("mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input type="number" value={passenger.age} onChange={e => setP("age", e.target.value)} placeholder="e.g. 45" min={1} max={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={passenger.gender} onValueChange={v => setP("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar Number</Label>
              <Input value={passenger.aadhaar} onChange={e => setP("aadhaar", e.target.value)} placeholder="XXXX-XXXX-XXXX" maxLength={14} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Textarea value={passenger.address} onChange={e => setP("address", e.target.value)} rows={2} placeholder="Full address" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-sm font-semibold mb-3">Seat Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Seat Number <span className="text-red-500">*</span></Label>
                <Input value={seatNumber} onChange={e => setSeatNumber(e.target.value)} placeholder="e.g. A1, 12, Upper-3" />
              </div>
              <div className="space-y-1.5">
                <Label>Seat Type</Label>
                <Select value={seatType} onValueChange={v => setSeatType(v as "seat" | "sleeper")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seat">Seat — {formatCurrency(selectedTrip.seatPrice)}</SelectItem>
                    {selectedTrip.sleeperSeats > 0 && (
                      <SelectItem value="sleeper">Sleeper — {formatCurrency(selectedTrip.sleeperPrice)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Package Amount (₹)</Label>
                <Input value={formatCurrency(packageAmount)} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount (₹)</Label>
                <Input type="number" value={discount} onChange={e => setDiscount(Math.max(0, +e.target.value))} min={0} max={packageAmount} />
              </div>
              {discount > 0 && (
                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <Label>Discount Reason</Label>
                  <Input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="e.g. Senior citizen, group booking" />
                </div>
              )}
              <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span>{formatCurrency(packageAmount)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>- {formatCurrency(discount)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Final Amount</span><span>{formatCurrency(finalAmount)}</span></div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Available seats: {availableSeats} of {selectedTrip.totalSeats}</p>
        </div>
      )}

      {/* ── Step 2: Payment ── */}
      {step === 2 && selectedTrip && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Details</h2>

          {/* Summary card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-sm space-y-1">
              <div className="flex justify-between font-semibold"><span>{selectedTrip.tripName}</span><span>{formatCurrency(finalAmount)}</span></div>
              <div className="flex justify-between text-muted-foreground text-xs"><span>{passenger.name} · Seat {seatNumber} ({seatType})</span>{discount > 0 && <span>Disc: -{formatCurrency(discount)}</span>}</div>
            </CardContent>
          </Card>

          {/* Payment mode toggle */}
          <div>
            <Label className="mb-2 block">Payment Mode</Label>
            <div className="flex gap-2">
              {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value} type="button" variant={payment.mode === value ? "default" : "outline"}
                  className="flex-1 gap-1 text-xs" size="sm"
                  onClick={() => setPayment(p => ({ ...p, mode: value }))}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Advance Amount (₹)</Label>
              <Input type="number" value={payment.advancePaid || ""} placeholder="0 = tentative"
                onChange={e => setPayment(p => ({ ...p, advancePaid: Math.max(0, +e.target.value) }))} />
            </div>
            {payment.mode !== "cash" && (
              <div className="space-y-1.5">
                <Label>Reference / UTR No.</Label>
                <Input value={payment.referenceNumber} placeholder="Transaction ID"
                  onChange={e => setPayment(p => ({ ...p, referenceNumber: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Remaining amount */}
          {!advanceExceedsTotal ? (
            <div className={`p-3 rounded-lg text-sm font-medium border ${pendingAmount === 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
              <div className="flex justify-between">
                <span>{pendingAmount === 0 ? "Fully Paid" : "Remaining Amount"}</span>
                <span className="font-bold">{formatCurrency(pendingAmount)}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Advance cannot exceed total amount
            </div>
          )}

          {/* Payment screenshot upload */}
          <div className="space-y-2">
            <Label>Payment Screenshot (optional)</Label>
            {payment.screenshot ? (
              <div className="relative border rounded-lg overflow-hidden w-full max-h-48">
                <img src={payment.screenshot} alt="Payment proof" className="w-full object-contain max-h-48" />
                <button onClick={clearScreenshot} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-0.5 hover:bg-black">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                  Proof uploaded — pending admin approval
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload payment screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5 MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={payment.notes} rows={2} placeholder="Special requirements, remarks..."
              onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Auto-stamp info */}
          <div className="text-xs text-muted-foreground border-t pt-3 space-y-0.5">
            <p>Staff: <span className="font-medium text-foreground">{user?.name}</span> (ID: {user?.id})</p>
            <p>Booking time: <span className="font-medium text-foreground">{new Date().toLocaleString("en-IN")}</span></p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="outline" onClick={() => step === 0 ? navigate(-1) : setStep((step - 1) as Step)}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((step + 1) as Step)} disabled={!canNext()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700" disabled={!canNext()}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Booking
          </Button>
        )}
      </div>

      {/* ── Receipt Dialog ── */}
      {savedBooking && (() => {
        const isFullyPaid = savedBooking.pendingAmount === 0;
        const pct = savedBooking.finalAmount > 0
          ? Math.round((savedBooking.advancePaid / savedBooking.finalAmount) * 100) : 100;
        const dtStr = new Date(savedBooking.bookingDateTime).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        });

        const Row = ({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) => (
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className={`text-sm font-semibold text-right max-w-[55%] break-words ${valueClass}`}>{value}</span>
          </div>
        );

        return (
          <Dialog open={receiptOpen} onOpenChange={(open) => { if (!open) { resetForm(); navigate("/bookings"); } setReceiptOpen(open); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-md p-0 gap-0 max-h-[96vh] flex flex-col overflow-hidden">
              <DialogTitle className="sr-only">Booking Confirmed — {savedBooking.id}</DialogTitle>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1">
                <div ref={receiptRef} className="bg-white">

                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b border-slate-100">
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2.5} />
                    </div>
                    <p className="text-xl font-bold text-slate-900 mb-1">Booking Confirmed</p>
                    <p className="text-slate-400 text-xs mb-4">Ananda Rath Voyages</p>
                    <span className="inline-block bg-slate-100 text-slate-600 text-xs font-mono font-semibold px-3 py-1.5 rounded-md">
                      {savedBooking.id}
                    </span>
                  </div>

                  {/* Trip */}
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip</p>
                    <p className="font-semibold text-slate-900 text-sm">{savedBooking.tripName}</p>
                    {selectedTrip && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(selectedTrip.startDate)} – {formatDate(selectedTrip.endDate)} · {selectedTrip.departurePoint}
                      </p>
                    )}
                  </div>

                  {/* Passenger & Seat */}
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Passenger</p>
                    <Row label="Name"    value={savedBooking.passengerName} />
                    <Row label="Contact" value={savedBooking.passengerMobile} />
                    {savedBooking.passengerAge && (
                      <Row label="Age / Gender" value={`${savedBooking.passengerAge} / ${savedBooking.passengerGender}`} />
                    )}
                    <Row label="Seat" value={`${savedBooking.seatNumber} (${savedBooking.seatType})`} />
                  </div>

                  {/* Payment */}
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                    <Row label="Package Amount" value={formatCurrency(savedBooking.packageAmount)} />
                    {savedBooking.discount > 0 && (
                      <Row label="Discount" value={`− ${formatCurrency(savedBooking.discount)}`} valueClass="text-red-500" />
                    )}
                    <Row label="Final Amount"  value={formatCurrency(savedBooking.finalAmount)} />
                    <Row label="Advance Paid"  value={formatCurrency(savedBooking.advancePaid)} valueClass="text-green-600" />
                    <Row label="Mode"          value={(savedBooking.paymentMode || "Cash").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} />
                  </div>

                  {/* Balance indicator */}
                  <div className="px-5 pt-3 pb-4">
                    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${isFullyPaid ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isFullyPaid ? "text-green-700" : "text-amber-700"}`}>
                        {isFullyPaid ? "Fully Paid" : "Balance Due"}
                      </span>
                      <span className={`text-lg font-black ${isFullyPaid ? "text-green-700" : "text-amber-700"}`}>
                        {isFullyPaid ? formatCurrency(savedBooking.finalAmount) : formatCurrency(savedBooking.pendingAmount)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    {!isFullyPaid && (
                      <div className="mt-2.5">
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">{pct}% paid</p>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="px-5 pb-1 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Collected By</p>
                    <Row label="Staff"  value={`${savedBooking.collectedBy} (${savedBooking.staffId})`} />
                    <Row label="Date"   value={dtStr} />
                  </div>

                  {/* Screenshot */}
                  {savedBooking.paymentScreenshot && (
                    <div className="px-5 pt-4 pb-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Screenshot</p>
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Pending Verification</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <img src={savedBooking.paymentScreenshot} alt="Payment proof" className="w-full object-contain max-h-36" />
                      </div>
                    </div>
                  )}

                  {/* Footer note */}
                  <div className="px-5 py-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Thank you for traveling with Ananda Rath Voyages 🙏</p>
                  </div>

                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t bg-white px-4 py-3 grid grid-cols-2 gap-2 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openPrintWindow}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openPrintWindow}>
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </Button>
                <Button size="sm" className="gap-1.5 text-xs bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={shareOnWhatsApp}>
                  <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setReceiptOpen(false); resetForm(); }}>
                  <Plus className="h-3.5 w-3.5" /> New Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
