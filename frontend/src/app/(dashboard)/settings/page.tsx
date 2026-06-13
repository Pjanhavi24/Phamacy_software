"use client";

import { useState, useEffect } from "react";
import {
  getStoreSettings,
  saveStoreSettings,
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from "@/lib/store-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Users,
  FileText,
  Database,
  Upload,
  Plus,
  Download,
  HardDrive,
  CheckCircle,
  Save,
  Settings as SettingsIcon,
  Palette,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { PageContainer, PageHeader } from "@/components/design-system";
import { cn } from "@/lib/utils";

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Pharmacist" | "Cashier" | "Manager";
  lastLogin: string;
  active: boolean;
}

// --- Mock Data ---
const initialUsers: User[] = [
  { id: 1, name: "Dr. Rajan Mehta", email: "rajan@medplus.com", role: "Admin", lastLogin: "Today, 9:14 AM", active: true },
  { id: 2, name: "Sneha Kulkarni", email: "sneha@medplus.com", role: "Pharmacist", lastLogin: "Today, 8:50 AM", active: true },
  { id: 3, name: "Arjun Das", email: "arjun@medplus.com", role: "Cashier", lastLogin: "Yesterday", active: true },
  { id: 4, name: "Pooja Iyer", email: "pooja@medplus.com", role: "Manager", lastLogin: "2 days ago", active: false },
];

const roleBadgeStyle: Record<string, string> = {
  Admin: "bg-red-500/20 text-red-400 border-red-500/30",
  Pharmacist: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Cashier: "bg-green-500/20 text-green-400 border-green-500/30",
  Manager: "bg-blue-600/20 text-blue-600 border-purple-500/30",
};

// --- Sub-components ---

function StoreProfileTab() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Load persisted settings on mount (avoids SSR/localStorage mismatch).
  useEffect(() => setForm(getStoreSettings()), []);

  const set = (patch: Partial<StoreSettings>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    saveStoreSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Store Logo</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">Appears on invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center">
            <Store className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2 text-sm">
              <Upload className="w-4 h-4" />
              Upload Logo
            </Button>
            <p className="text-gray-500 dark:text-gray-400 text-xs">PNG, JPG up to 2 MB. Recommended: 200×200px</p>
          </div>
        </CardContent>
      </Card>

      {/* Store Details */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Store Details</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Shown on printed bills &amp; invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Store Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Address (street)</Label>
            <Textarea
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">City</Label>
            <Input
              value={form.city}
              onChange={(e) => set({ city: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">State</Label>
            <Input
              value={form.state}
              onChange={(e) => set({ state: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) => set({ pincode: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Email</Label>
            <Input
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">GSTIN</Label>
            <Input
              value={form.gstin}
              onChange={(e) => set({ gstin: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Drug License Number</Label>
            <Input
              value={form.dlNumber}
              onChange={(e) => set({ dlNumber: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Default Bill Print Format</Label>
            <Select
              value={form.printFormat}
              onValueChange={(v) => set({ printFormat: v as "a4" | "thermal" })}
            >
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal">Thermal (80mm receipt)</SelectItem>
                <SelectItem value="a4">A4 (full page)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className={`gap-2 ${
            saved ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
          } text-white transition-colors`}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Cashier" as User["role"], password: "" });

  const toggleUser = (id: number) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  const addUser = () => {
    if (!newUser.name || !newUser.email) return;
    setUsers([
      ...users,
      { id: Date.now(), ...newUser, lastLogin: "Never", active: true },
    ]);
    setNewUser({ name: "", email: "", role: "Cashier", password: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{users.length} users total · {users.filter((u) => u.active).length} active</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-gray-100">Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Full Name</Label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Email</Label>
                <Input
                  placeholder="user@pharmacy.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v as User["role"] })}
                >
                  <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Temporary Password</Label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="text-gray-500 dark:text-gray-400" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={addUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                <TableCell className="text-gray-900 dark:text-gray-100 text-sm font-medium">{user.name}</TableCell>
                <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeStyle[user.role]}`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{user.lastLogin}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.active}
                    onCheckedChange={() => toggleUser(user.id)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function InvoiceSettingsTab() {
  const [prefix, setPrefix] = useState("PHR-");
  const [startNum, setStartNum] = useState("1001");
  const [terms, setTerms] = useState(
    "1. Medicines once sold will not be taken back.\n2. Please check medicines before leaving the counter.\n3. Keep medicines out of reach of children."
  );
  const [fields, setFields] = useState({
    showGST: true,
    showBatchNo: true,
    showExpiry: true,
    showDoctor: false,
    showPatientAge: false,
    showMRP: true,
  });

  const fieldLabels: Record<keyof typeof fields, string> = {
    showGST: "Show GST Breakdown",
    showBatchNo: "Show Batch Number",
    showExpiry: "Show Expiry Date",
    showDoctor: "Show Doctor Name",
    showPatientAge: "Show Patient Age",
    showMRP: "Show MRP Column",
  };

  return (
    <div className="space-y-5">
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Invoice Numbering</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Invoice Prefix</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
            <p className="text-gray-500 dark:text-gray-400 text-xs">e.g. PHR-1001</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-500 dark:text-gray-400 text-xs">Starting Number</Label>
            <Input
              type="number"
              value={startNum}
              onChange={(e) => setStartNum(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Invoice Fields</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">Toggle which fields appear on printed invoices</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
            <div key={key} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-gray-700 dark:text-gray-300 text-sm">{fieldLabels[key]}</span>
              <Switch
                checked={fields[key]}
                onCheckedChange={(v) => setFields({ ...fields, [key]: v })}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Terms & Conditions</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">Printed at the bottom of every invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-500 resize-none text-sm"
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Save className="w-4 h-4" />
          Save Invoice Settings
        </Button>
      </div>
    </div>
  );
}

function BackupDataTab() {
  const [backing, setBacking] = useState(false);
  const [lastBackup] = useState("2026-06-01 at 02:00 AM (Auto)");

  const handleBackup = () => {
    setBacking(true);
    setTimeout(() => setBacking(false), 2000);
  };

  const exports = [
    { label: "All Sales Data", desc: "Complete billing history as CSV", icon: FileText },
    { label: "Inventory Snapshot", desc: "Current stock with valuations", icon: HardDrive },
    { label: "Purchase Orders", desc: "All supplier purchase records", icon: Database },
  ];

  return (
    <div className="space-y-5">
      {/* Backup Status */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Database Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">Last backup successful</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{lastBackup}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleBackup}
              disabled={backing}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <HardDrive className="w-4 h-4" />
              {backing ? "Backing up..." : "Backup Now"}
            </Button>
            <Button variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2">
              <Download className="w-4 h-4" />
              Download Last Backup
            </Button>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-xs">Automatic backups run daily at 2:00 AM. Backups are retained for 30 days.</p>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Export Data</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">Download your data in CSV format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exports.map((ex) => (
            <div
              key={ex.label}
              className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <ex.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{ex.label}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{ex.desc}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 text-sm">Danger Zone</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Reset All Data</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Permanently delete all records from this pharmacy instance</p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Reset Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Light", desc: "Bright theme for well-lit spaces", icon: Sun },
    { value: "dark", label: "Dark", desc: "Easy on the eyes in low light", icon: Moon },
    { value: "system", label: "System", desc: "Follow your device setting", icon: Monitor },
  ];
  const current = mounted ? theme ?? "system" : "system";

  return (
    <div className="space-y-5">
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 text-sm">Theme</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Choose how PharmaERP looks. {mounted && `Currently showing the ${resolvedTheme} theme.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {options.map((opt) => {
            const active = current === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/40"
                    : "border-gray-200 bg-gray-100 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800 dark:hover:border-gray-700"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <opt.icon className={cn("h-5 w-5", active ? "text-blue-600" : "text-gray-500 dark:text-gray-400")} />
                  {active && <CheckCircle className="h-4 w-4 text-blue-600" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opt.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Page ---
export default function SettingsPage() {
  const tabs = [
    { value: "profile", label: "Store Profile", icon: Store },
    { value: "appearance", label: "Appearance", icon: Palette },
    { value: "users", label: "Users & Access", icon: Users },
    { value: "invoice", label: "Invoice Settings", icon: FileText },
    { value: "backup", label: "Backup & Data", icon: Database },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Manage your pharmacy configuration"
        icon={SettingsIcon}
      />

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 h-auto flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 dark:text-gray-400 gap-2 px-4 py-2 rounded-md text-sm transition-colors"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <StoreProfileTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="invoice">
          <InvoiceSettingsTab />
        </TabsContent>

        <TabsContent value="backup">
          <BackupDataTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
