import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { formatDate, generateId } from "@/lib/utils";
import type { Passenger } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EMPTY: Omit<Passenger, "id" | "createdAt"> = {
  name: "", mobile: "", alternateMobile: "", address: "", aadhaarLast4: "",
  age: 0, gender: "Male", bloodGroup: "B+",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "",
};

export default function PassengerManagement() {
  const { passengers, setPassengers, bookings } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [viewing, setViewing] = useState<Passenger | null>(null);
  const [form, setForm] = useState<Omit<Passenger, "id" | "createdAt">>(EMPTY);

  const filtered = passengers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile.includes(search)
  );

  const f = (field: string, value: string | number) => setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (p: Passenger) => { setEditing(p); setForm({ ...p }); setDialogOpen(true); };
  const openView = (p: Passenger) => { setViewing(p); setViewOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.mobile) { toast.error("Name and mobile are required"); return; }
    const dup = passengers.find((p) => p.mobile === form.mobile && p.id !== editing?.id);
    if (dup) { toast.error("A passenger with this mobile number already exists"); return; }
    if (editing) {
      setPassengers((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...form } : p));
      toast.success("Passenger updated");
    } else {
      setPassengers((prev) => [...prev, { id: generateId("P"), createdAt: new Date().toISOString(), ...form }]);
      toast.success("Passenger added");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const hasBookings = bookings.some((b) => b.passengerId === deleteId);
    if (hasBookings) { toast.error("Cannot delete — passenger has existing bookings"); setDeleteId(null); return; }
    setPassengers((prev) => prev.filter((p) => p.id !== deleteId));
    toast.success("Passenger deleted");
    setDeleteId(null);
  };

  const passengerTrips = (pid: string) =>
    bookings.filter((b) => b.passengerId === pid && b.status !== "cancelled");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Passenger Management</h1>
          <p className="text-muted-foreground text-sm">{passengers.length} passengers registered</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Passenger</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{passengers.length}</p><p className="text-xs text-muted-foreground mt-1">Total Passengers</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{passengers.filter(p => p.gender === "Male").length}</p><p className="text-xs text-muted-foreground mt-1">Male</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{passengers.filter(p => p.gender === "Female").length}</p><p className="text-xs text-muted-foreground mt-1">Female</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Age / Gender</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>Emergency Contact</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{p.mobile}</p>
                  {p.alternateMobile && <p className="text-xs text-muted-foreground">{p.alternateMobile}</p>}
                </TableCell>
                <TableCell className="text-sm">{p.age} / {p.gender}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{p.bloodGroup}</Badge>
                </TableCell>
                <TableCell className="text-sm">{passengerTrips(p.id).length} bookings</TableCell>
                <TableCell>
                  <p className="text-xs">{p.emergencyContactName}</p>
                  <p className="text-xs text-muted-foreground">{p.emergencyContactPhone}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openView(p)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No passengers found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Passenger" : "Add New Passenger"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="e.g. Sita Devi Mohanty" />
            </div>
            <div className="space-y-2">
              <Label>Mobile *</Label>
              <Input value={form.mobile} onChange={(e) => f("mobile", e.target.value)} placeholder="10-digit mobile" />
            </div>
            <div className="space-y-2">
              <Label>Alternate Mobile</Label>
              <Input value={form.alternateMobile} onChange={(e) => f("alternateMobile", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={(e) => f("age", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => f("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => f("bloodGroup", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aadhaar Last 4 Digits</Label>
              <Input value={form.aadhaarLast4} onChange={(e) => f("aadhaarLast4", e.target.value)} maxLength={4} placeholder="XXXX" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => f("address", e.target.value)} rows={2} />
            </div>
            <div className="col-span-2 border-t pt-3">
              <p className="text-sm font-semibold mb-3">Emergency Contact</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.emergencyContactName} onChange={(e) => f("emergencyContactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.emergencyContactPhone} onChange={(e) => f("emergencyContactPhone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Input value={form.emergencyContactRelation} onChange={(e) => f("emergencyContactRelation", e.target.value)} placeholder="Husband/Son/etc." />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Passenger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewing && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Passenger Details</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{viewing.name}</p></div>
                <div><p className="text-muted-foreground">ID</p><p className="font-medium">{viewing.id}</p></div>
                <div><p className="text-muted-foreground">Mobile</p><p className="font-medium">{viewing.mobile}</p></div>
                <div><p className="text-muted-foreground">Alt. Mobile</p><p className="font-medium">{viewing.alternateMobile || "—"}</p></div>
                <div><p className="text-muted-foreground">Age</p><p className="font-medium">{viewing.age}</p></div>
                <div><p className="text-muted-foreground">Gender</p><p className="font-medium">{viewing.gender}</p></div>
                <div><p className="text-muted-foreground">Blood Group</p><Badge variant="outline">{viewing.bloodGroup}</Badge></div>
                <div><p className="text-muted-foreground">Aadhaar</p><p className="font-medium">XXXX XXXX XXXX {viewing.aadhaarLast4}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{viewing.address}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Emergency Contact</p>
                <p>{viewing.emergencyContactName} ({viewing.emergencyContactRelation}) — {viewing.emergencyContactPhone}</p>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Trip History</p>
                {passengerTrips(viewing.id).length === 0 ? (
                  <p className="text-muted-foreground">No trips</p>
                ) : (
                  passengerTrips(viewing.id).map((b) => (
                    <div key={b.id} className="flex justify-between py-1 border-b last:border-0">
                      <span>{b.tripName}</span>
                      <Badge variant="outline">{b.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Passenger?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
