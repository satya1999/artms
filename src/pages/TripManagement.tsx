import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId, hasRole } from "@/lib/utils";
import type { Trip, TripStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Bus, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<TripStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const EMPTY_TRIP: Omit<Trip, "id" | "createdAt"> = {
  tripName: "", startDate: "", endDate: "", departurePoint: "", destination: "",
  totalSeats: 0, sleeperSeats: 0, seatPrice: 0, sleeperPrice: 0,
  busAssigned: "", status: "draft", inclusions: "",
};

export default function TripManagement() {
  const { trips, setTrips, bookings, buses } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [form, setForm] = useState<Omit<Trip, "id" | "createdAt">>(EMPTY_TRIP);

  const canEdit = hasRole(user, "super_admin", "accountant");

  const filtered = trips.filter((t) => {
    const matchSearch = t.tripName.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_TRIP); setDialogOpen(true); };
  const openEdit = (trip: Trip) => { setEditing(trip); setForm({ ...trip }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.tripName || !form.startDate || !form.endDate) {
      toast.error("Fill in all required fields"); return;
    }
    if (editing) {
      setTrips((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...form } : t));
      toast.success("Trip updated");
    } else {
      const newTrip: Trip = { id: generateId("T"), createdAt: new Date().toISOString(), ...form };
      setTrips((prev) => [...prev, newTrip]);
      toast.success("Trip created");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const hasBookings = bookings.some((b) => b.tripId === deleteId);
    if (hasBookings) { toast.error("Cannot delete — this trip has bookings"); setDeleteId(null); return; }
    setTrips((prev) => prev.filter((t) => t.id !== deleteId));
    toast.success("Trip deleted");
    setDeleteId(null);
  };

  const updateForm = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trip Management</h1>
          <p className="text-muted-foreground text-sm">{trips.length} trips total</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Trip
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["upcoming", "active", "completed", "cancelled"] as TripStatus[]).map((status) => (
          <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status)}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{trips.filter((t) => t.status === status).length}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">{status} Trips</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search trips..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TripStatus | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip Name</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Price (Seat/Sleeper)</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((trip) => {
              const booked = bookings.filter((b) => b.tripId === trip.id && b.status !== "cancelled").length;
              return (
                <TableRow key={trip.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{trip.tripName}</p>
                      <p className="text-xs text-muted-foreground">{trip.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(trip.startDate)}</p>
                      <p className="text-muted-foreground">to {formatDate(trip.endDate)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{trip.departurePoint}</p>
                      <p className="text-muted-foreground">→ {trip.destination}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{booked}/{trip.totalSeats}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{formatCurrency(trip.seatPrice)}</p>
                    {trip.sleeperSeats > 0 && <p className="text-muted-foreground">{formatCurrency(trip.sleeperPrice)}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{trip.busAssigned}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[trip.status]}>{trip.status}</Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(trip)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(trip.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No trips found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Trip" : "New Trip"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Trip Name *</Label>
              <Input value={form.tripName} onChange={(e) => updateForm("tripName", e.target.value)} placeholder="e.g. Mathura-Vrindavan Yatra" />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={form.endDate} onChange={(e) => updateForm("endDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departure Point</Label>
              <Input value={form.departurePoint} onChange={(e) => updateForm("departurePoint", e.target.value)} placeholder="e.g. Bhubaneswar" />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input value={form.destination} onChange={(e) => updateForm("destination", e.target.value)} placeholder="e.g. Mathura-Vrindavan" />
            </div>
            <div className="space-y-2">
              <Label>Total Seats</Label>
              <Input type="number" value={form.totalSeats} onChange={(e) => updateForm("totalSeats", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sleeper Seats</Label>
              <Input type="number" value={form.sleeperSeats} onChange={(e) => updateForm("sleeperSeats", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Seat Price (₹)</Label>
              <Input type="number" value={form.seatPrice} onChange={(e) => updateForm("seatPrice", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sleeper Price (₹)</Label>
              <Input type="number" value={form.sleeperPrice} onChange={(e) => updateForm("sleeperPrice", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bus Assigned</Label>
              <Select value={form.busAssigned} onValueChange={(v) => updateForm("busAssigned", v)}>
                <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
                <SelectContent>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={b.registrationNumber}>
                      {b.registrationNumber} — {b.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateForm("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Inclusions</Label>
              <Textarea value={form.inclusions} onChange={(e) => updateForm("inclusions", e.target.value)} placeholder="Bus, Hotel, Meals, Guide..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Trip?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
