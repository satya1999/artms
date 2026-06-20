import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockUsers } from "@/data/mockData";
import { formatDate, hasRole, effectiveRoles } from "@/lib/utils";
import type { User, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES: UserRole[] = ["super_admin", "accountant", "booking_executive", "tour_manager"];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  accountant: "Accountant",
  booking_executive: "Booking Executive",
  tour_manager: "Tour Manager",
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-red-700",
  accountant: "bg-purple-100 text-purple-700",
  booking_executive: "bg-blue-100 text-blue-700",
  tour_manager: "bg-green-100 text-green-700",
};

type FormState = { name: string; email: string; phone: string; roles: UserRole[]; active: boolean };

const EMPTY_FORM: FormState = { name: "", email: "", phone: "", roles: ["booking_executive"], active: true };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const f = (field: keyof Omit<FormState, "roles">, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleRole = (role: UserRole) =>
    setForm((prev) => {
      const has = prev.roles.includes(role);
      if (has && prev.roles.length === 1) return prev; // keep at least one
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] };
    });

  if (!hasRole(currentUser, "super_admin")) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm text-muted-foreground">Only Super Admin can manage users</p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || "", roles: effectiveRoles(u), active: u.active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    if (form.roles.length === 0) { toast.error("Select at least one role"); return; }

    const primaryRole = form.roles[0];

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: form.name, email: form.email, phone: form.phone, role: primaryRole, roles: form.roles, active: form.active }
            : u
        )
      );
      toast.success("User updated");
    } else {
      const newUser: User = {
        id: `U${String(users.length + 1).padStart(3, "0")}`,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: primaryRole,
        roles: form.roles,
        active: form.active,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setUsers((prev) => [...prev, newUser]);
      toast.success("User created — default password: artms@2026");
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => {
    if (id === currentUser?.id) { toast.error("Cannot deactivate your own account"); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">{users.filter((u) => u.active).length} active users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        </div>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_ROLES.map((role) => (
          <Card key={role}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">
                {users.filter((u) => effectiveRoles(u).includes(role)).length}
              </p>
              <Badge className={`text-xs mt-1 ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      {u.id === currentUser?.id && <p className="text-xs text-blue-600">You</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {effectiveRoles(u).map((r) => (
                      <Badge key={r} className={`text-xs ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                <TableCell className="text-sm">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <Badge className={u.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                    {u.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className={u.active ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}
                      onClick={() => toggleActive(u.id)}
                      disabled={u.id === currentUser?.id}
                    >
                      {u.active ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Role Permissions reference table */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Role Permissions</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Permission</th>
                  <th className="text-center py-2 px-3">Super Admin</th>
                  <th className="text-center py-2 px-3">Accountant</th>
                  <th className="text-center py-2 px-3">Booking Executive</th>
                  <th className="text-center py-2 px-3">Tour Manager</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Create Trips",      true,  false, false, false],
                  ["Manage Bookings",   true,  true,  true,  false],
                  ["Collect Payments",  true,  true,  true,  false],
                  ["Add Expenses",      true,  true,  false, true ],
                  ["View Reports",      true,  true,  false, false],
                  ["Manage Salary",     true,  true,  false, false],
                  ["Manage Users",      true,  false, false, false],
                  ["View Dashboard",    true,  true,  true,  true ],
                ].map(([label, ...perms]) => (
                  <tr key={String(label)} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                    {perms.map((p, i) => (
                      <td key={i} className="text-center py-2 px-3">
                        {p ? <span className="text-green-600">✓</span> : <span className="text-red-400">✗</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => f("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => f("phone", e.target.value)} />
            </div>

            {/* Multi-role checkboxes */}
            <div className="space-y-2">
              <Label>Roles * <span className="text-xs text-muted-foreground font-normal">(select one or more)</span></Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {ALL_ROLES.map((role) => {
                  const checked = form.roles.includes(role);
                  const isLast = checked && form.roles.length === 1;
                  return (
                    <label
                      key={role}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        checked ? "border-blue-500 bg-blue-50" : "border-border hover:bg-muted/50"
                      } ${isLast ? "opacity-60" : ""}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRole(role)}
                        disabled={isLast}
                      />
                      <span className="text-sm">{ROLE_LABELS[role]}</span>
                    </label>
                  );
                })}
              </div>
              {form.roles.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  Primary role: <strong>{ROLE_LABELS[form.roles[0]]}</strong> — determines sidebar label
                </p>
              )}
            </div>

            {!editingUser && (
              <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                Default password: <code>artms@2026</code>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
