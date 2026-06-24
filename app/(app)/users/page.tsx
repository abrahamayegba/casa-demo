"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUser, deleteUser, generateId } from "@/lib/store";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Switch,
} from "@/components/ui/switch";
import {
  Users, Plus, MoreHorizontal, Pencil, Trash2, ShieldCheck, Eye, Search,
  UserCheck, UserX,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role !== "admin") { router.push("/dashboard"); return; }
    setUsers(getUsers());
  }, [currentUser, router]);

  function load() { setUsers(getUsers()); }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function handleToggleActive(user: User) {
    if (user.id === currentUser?.id) return;
    saveUser({ ...user, isActive: !user.isActive });
    load();
  }

  function handleSave(data: Partial<User> & { id?: string }) {
    if (data.id) {
      const existing = users.find((u) => u.id === data.id)!;
      saveUser({ ...existing, ...data });
    } else {
      saveUser({
        id: generateId("usr"),
        name: data.name!,
        email: data.email!,
        passwordHash: data.passwordHash!,
        role: data.role!,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    load();
    setAddOpen(false);
    setEditUser(null);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          size="sm"
          className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-8 h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Last Login</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    <Users className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    No users found.
                  </td>
                </tr>
              ) : filtered.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`${idx < filtered.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/20 transition-colors`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand-purple)]/10 flex items-center justify-center text-[var(--brand-purple)] text-xs font-semibold shrink-0">
                        {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-xs">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">You</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex items-center gap-1 w-fit ${u.role === "admin" ? "border-[var(--brand-purple)]/30 text-[var(--brand-purple)] bg-[var(--brand-purple)]/5" : "border-border"}`}
                    >
                      {u.role === "admin" ? <ShieldCheck className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), "dd MMM yyyy")}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {u.lastLogin ? format(new Date(u.lastLogin), "dd MMM yyyy") : "Never"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={() => handleToggleActive(u)}
                        disabled={u.id === currentUser?.id}
                        className="scale-75 data-[state=checked]:bg-green-600"
                      />
                      <Badge
                        variant="outline"
                        className={`text-[10px] flex items-center gap-0.5 w-fit ${u.isActive ? "border-green-200 text-green-700 bg-green-50" : "border-border text-muted-foreground"}`}
                      >
                        {u.isActive ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          disabled={u.id === currentUser?.id}
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      {(addOpen || editUser) && (
        <UserFormDialog
          open={addOpen || !!editUser}
          onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditUser(null); } }}
          initialData={editUser ?? undefined}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? They will lose all access to the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteId) { deleteUser(deleteId); load(); setDeleteId(null); } }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserFormDialog({
  open, onOpenChange, initialData, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: User;
  onSave: (data: Partial<User> & { id?: string }) => void;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState<"admin" | "viewer">(initialData?.role ?? "viewer");
  const [password, setPassword] = useState(initialData?.passwordHash ?? "");

  const isEdit = !!initialData;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name: name.trim(),
      email: email.trim(),
      role,
      passwordHash: password,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this user's details." : "Create a new portal user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="uname">Full Name *</Label>
            <Input id="uname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="uemail">Email Address *</Label>
            <Input id="uemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "viewer")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — full access</SelectItem>
                <SelectItem value="viewer">Viewer — read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="upw">{isEdit ? "Password (leave blank to keep)" : "Password *"}</Label>
            <Input
              id="upw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
            />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              disabled={!name || !email || (!isEdit && !password)}
            >
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
