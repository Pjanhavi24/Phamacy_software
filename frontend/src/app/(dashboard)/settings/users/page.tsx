"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  UserX,
  ShieldCheck,
  ChevronLeft,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  SearchInput,
  TableEmpty,
} from "@/components/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRole = "Admin" | "Pharmacist" | "Billing Staff" | "Store Manager" | "Viewer";
type UserStatus = "active" | "inactive";

interface StoreUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  store: string;
  lastLogin: string;
  status: UserStatus;
}

const initialUsers: StoreUser[] = [
  { id: 1, name: "Dr. Meena Iyer", email: "meena@greenpharmacy.in", role: "Admin", store: "All Stores", lastLogin: "01 Jun 2026, 09:14", status: "active" },
  { id: 2, name: "Ravi Kumar", email: "ravi.k@greenpharmacy.in", role: "Pharmacist", store: "Branch 1 - MG Road", lastLogin: "01 Jun 2026, 08:52", status: "active" },
  { id: 3, name: "Sunita Desai", email: "sunita@greenpharmacy.in", role: "Billing Staff", store: "Branch 1 - MG Road", lastLogin: "31 May 2026, 18:30", status: "active" },
  { id: 4, name: "Arjun Mehta", email: "arjun@greenpharmacy.in", role: "Store Manager", store: "Branch 2 - HSR Layout", lastLogin: "30 May 2026, 14:10", status: "active" },
  { id: 5, name: "Pooja Nair", email: "pooja@greenpharmacy.in", role: "Billing Staff", store: "Branch 2 - HSR Layout", lastLogin: "28 May 2026, 11:00", status: "inactive" },
  { id: 6, name: "Suresh Pillai", email: "suresh@greenpharmacy.in", role: "Viewer", store: "All Stores", lastLogin: "20 May 2026, 16:45", status: "inactive" },
];

const roleColors: Record<UserRole, string> = {
  Admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Pharmacist: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Billing Staff": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Store Manager": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const roles: UserRole[] = ["Admin", "Pharmacist", "Billing Staff", "Store Manager", "Viewer"];
const stores = ["All Stores", "Branch 1 - MG Road", "Branch 2 - HSR Layout"];

interface AddUserForm {
  name: string;
  email: string;
  role: UserRole | "";
  store: string;
  tempPassword: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<StoreUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState<StoreUser | null>(null);
  const [form, setForm] = useState<AddUserForm>({
    name: "",
    email: "",
    role: "",
    store: "",
    tempPassword: "",
  });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddUser() {
    if (!form.name || !form.email || !form.role || !form.store) return;
    const newUser: StoreUser = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      role: form.role as UserRole,
      store: form.store,
      lastLogin: "Never",
      status: "active",
    };
    setUsers((prev) => [newUser, ...prev]);
    setForm({ name: "", email: "", role: "", store: "", tempPassword: "" });
    setAddOpen(false);
  }

  function handleDeactivate(user: StoreUser) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
      )
    );
    setDeactivateUser(null);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage staff access and permissions."
        icon={Users}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Settings
            </Link>
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="max-w-sm flex-1"
        />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a staff account. They will receive a login invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Rajesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rajesh@pharmacy.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign Store</Label>
                <Select
                  value={form.store}
                  onValueChange={(v) => setForm({ ...form, store: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Min 8 characters"
                  value={form.tempPassword}
                  onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  User will be prompted to change on first login.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <TableEmpty icon={Users} title="No users found" description="Try adjusting your search." />
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((user) => (
                <TableRow key={user.id} className={user.status === "inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        roleColors[user.role]
                      }`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{user.store}</TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">{user.lastLogin}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeactivateUser(user)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          {user.status === "active" ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <AlertDialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateUser?.status === "active" ? "Deactivate" : "Reactivate"} User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateUser?.status === "active"
                ? `${deactivateUser?.name} will lose access to the system immediately.`
                : `${deactivateUser?.name} will regain access to the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateUser && handleDeactivate(deactivateUser)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
