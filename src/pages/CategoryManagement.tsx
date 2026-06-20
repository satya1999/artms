import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { generateId } from "@/lib/utils";
import type { Category, CategoryType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Tag, TrendingUp, TrendingDown, LayoutGrid, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import { toast } from "sonner";

const TYPE_CONFIG: Record<CategoryType, { label: string; className: string; icon: React.ElementType }> = {
  expense: { label: "Expense", className: "bg-red-100 text-red-700", icon: TrendingDown },
  income:  { label: "Income",  className: "bg-green-100 text-green-700", icon: TrendingUp },
  general: { label: "General", className: "bg-slate-100 text-slate-600", icon: LayoutGrid },
};

type FormState = { name: string; type: CategoryType; description: string; parentId: string };
const EMPTY_FORM: FormState = { name: "", type: "expense", description: "", parentId: "" };

export default function CategoryManagement() {
  const { categories, setCategories } = useData();
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<CategoryType | "all">("all");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>({ ...EMPTY_FORM });

  const f = (field: keyof FormState, val: string) => setForm(p => ({ ...p, [field]: val }));

  // Roots and children
  const roots    = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const children = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.filter(c => c.parentId).forEach(c => {
      const arr = map.get(c.parentId!) ?? [];
      arr.push(c);
      map.set(c.parentId!, arr);
    });
    return map;
  }, [categories]);

  // Roots available as parents in the dialog (of matching or any type)
  const parentOptions = useMemo(() =>
    roots.filter(r => !editId || r.id !== editId), // can't be own parent
  [roots, editId]);

  const counts = useMemo(() => ({
    expense: categories.filter(c => c.type === "expense").length,
    income:  categories.filter(c => c.type === "income").length,
    general: categories.filter(c => c.type === "general").length,
  }), [categories]);

  // Filtered root list (search + type filter)
  const filteredRoots = useMemo(() => roots.filter(c => {
    const q = search.toLowerCase();
    const matchType = typeFilter === "all" || c.type === typeFilter;
    // show root if itself or any child matches
    const ownMatch = !q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
    const childMatch = (children.get(c.id) ?? []).some(ch =>
      ch.name.toLowerCase().includes(q) || (ch.description || "").toLowerCase().includes(q)
    );
    const matchSearch = !q || ownMatch || childMatch;
    return matchType && matchSearch;
  }), [roots, children, search, typeFilter]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openCreate = (parentId?: string) => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, parentId: parentId ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditId(c.id);
    setForm({ name: c.name, type: c.type, description: c.description ?? "", parentId: c.parentId ?? "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Category name is required"); return; }
    const dup = categories.find(c => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== editId);
    if (dup) { toast.error("A category with this name already exists"); return; }

    // Can't set parentId to a sub-category itself
    if (form.parentId) {
      const parent = categories.find(c => c.id === form.parentId);
      if (parent?.parentId) { toast.error("Sub-categories cannot have sub-categories"); return; }
    }

    if (editId) {
      // If changing a root to a sub, make sure it has no children
      const wasRoot = !categories.find(c => c.id === editId)?.parentId;
      if (wasRoot && form.parentId && (children.get(editId) ?? []).length > 0) {
        toast.error("Cannot move a parent category under another parent while it has sub-categories");
        return;
      }
      setCategories(prev => prev.map(c => c.id === editId
        ? { ...c, name: form.name.trim(), type: form.type, description: form.description.trim() || undefined, parentId: form.parentId || undefined }
        : c
      ));
      toast.success("Category updated");
    } else {
      const newCat: Category = {
        id: generateId("CAT"),
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || undefined,
        parentId: form.parentId || undefined,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCategories(prev => [...prev, newCat]);
      toast.success(form.parentId ? "Sub-category created" : "Category created");
      // Auto-expand the parent
      if (form.parentId) setExpanded(prev => new Set([...prev, form.parentId]));
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    // Delete category and all its children
    const childIds = (children.get(id) ?? []).map(c => c.id);
    setCategories(prev => prev.filter(c => c.id !== id && !childIds.includes(c.id)));
    toast.success(childIds.length > 0 ? `Deleted category and ${childIds.length} sub-categor${childIds.length > 1 ? "ies" : "y"}` : "Category deleted");
  };

  const handleDeleteSub = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success("Sub-category deleted");
  };

  const filterChildren = (parentId: string) => {
    const q = search.toLowerCase();
    return (children.get(parentId) ?? []).filter(ch => {
      const matchType = typeFilter === "all" || ch.type === typeFilter;
      const matchSearch = !q || ch.name.toLowerCase().includes(q) || (ch.description || "").toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Category Management</h1>
          <p className="text-muted-foreground text-sm">{categories.length} categories ({roots.length} parent, {categories.length - roots.length} sub)</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(TYPE_CONFIG) as [CategoryType, typeof TYPE_CONFIG[CategoryType]][]).map(([type, cfg]) => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cfg.className} ${typeFilter === type ? "ring-2 ring-offset-1 ring-current" : ""}`}>
                <cfg.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{counts[type]}</p>
                <p className="text-xs text-muted-foreground">{cfg.label} Categories</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as CategoryType | "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category tree */}
      <div className="space-y-2">
        {filteredRoots.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No categories found. Click "Add Category" to create one.
            </CardContent>
          </Card>
        )}

        {filteredRoots.map(cat => {
          const cfg = TYPE_CONFIG[cat.type];
          const subs = filterChildren(cat.id);
          const isExpanded = expanded.has(cat.id);
          const hasChildren = (children.get(cat.id) ?? []).length > 0;

          return (
            <Card key={cat.id} className="overflow-hidden">
              {/* Parent row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                {/* Expand chevron */}
                <button
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => toggleExpand(cat.id)}
                  disabled={!hasChildren}
                >
                  {hasChildren
                    ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                    : <div className="w-4 h-4" />
                  }
                </button>

                <div className={`p-1.5 rounded ${cfg.className}`}>
                  <cfg.icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{cat.name}</span>
                    <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                    {hasChildren && (
                      <span className="text-xs text-muted-foreground">{(children.get(cat.id) ?? []).length} sub-categor{(children.get(cat.id) ?? []).length > 1 ? "ies" : "y"}</span>
                    )}
                  </div>
                  {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" title="Add sub-category" onClick={() => { openCreate(cat.id); }}>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {hasChildren
                            ? `This will also delete all ${(children.get(cat.id) ?? []).length} sub-categor${(children.get(cat.id) ?? []).length > 1 ? "ies" : "y"} under it. This cannot be undone.`
                            : "This cannot be undone."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(cat.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Sub-categories */}
              {isExpanded && subs.length > 0 && (
                <div className="border-t bg-slate-50">
                  {subs.map((sub, idx) => {
                    const sCfg = TYPE_CONFIG[sub.type];
                    return (
                      <div key={sub.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors ${idx < subs.length - 1 ? "border-b border-slate-100" : ""}`}>
                        <div className="w-6 flex justify-center shrink-0">
                          <div className="w-px h-full bg-slate-300 relative">
                            <div className="absolute top-1/2 left-0 w-3 h-px bg-slate-300" />
                          </div>
                        </div>
                        <div className={`w-5 h-5 flex items-center justify-center rounded ${sCfg.className}`}>
                          <Tag className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{sub.name}</span>
                          {sub.description && <p className="text-xs text-muted-foreground truncate">{sub.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sub)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{sub.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteSub(sub.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty sub list hint when expanded */}
              {isExpanded && subs.length === 0 && (children.get(cat.id) ?? []).length > 0 && (
                <div className="border-t bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
                  All sub-categories filtered out
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Category" : (form.parentId ? "Add Sub-Category" : "Add Category")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => f("name", e.target.value)}
                placeholder={form.parentId ? "e.g. Budget Hotels" : "e.g. Accommodation"}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense — money going out</SelectItem>
                  <SelectItem value="income">Income — money coming in</SelectItem>
                  <SelectItem value="general">General — other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parent category (optional — only for root level create/edit) */}
            {(!editId || !categories.find(c => c.id === editId)?.parentId) && (
              <div className="space-y-1.5">
                <Label>Parent Category <span className="text-xs text-muted-foreground font-normal">(leave blank for top-level)</span></Label>
                <Select value={form.parentId || "none"} onValueChange={v => f("parentId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — top-level category</SelectItem>
                    {parentOptions.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({TYPE_CONFIG[p.type].label})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Description <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={form.description}
                onChange={e => f("description", e.target.value)}
                rows={2}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
