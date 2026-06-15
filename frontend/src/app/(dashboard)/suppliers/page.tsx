"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Building2,
  Eye,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
  TableEmpty,
  ErrorNote,
} from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useSuppliers, useSupplierLedger } from "@/hooks/useSuppliers";
import { SupplierPaymentDialog } from "@/components/suppliers/supplier-payment-dialog";

// Shared fetch + date-filter for the Purchases / Payments tabs.
interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  paymentStatus: string;
}
function useSupplierInvoices(supplierId: string | undefined, enabled: boolean) {
  return useQuery<SupplierInvoice[]>({
    queryKey: ["supplier-purchases", supplierId],
    enabled: enabled && !!supplierId,
    queryFn: async () => {
      const r = await apiClient.get("/purchases", { params: { supplierId, limit: 300 } });
      const list: any[] = r.data?.purchases ?? r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
      return list
        .map((p) => ({
          id: String(p.id),
          invoiceNumber: String(p.invoiceNumber ?? p.invoiceNo ?? p.id),
          date: p.invoiceDate ?? p.createdAt ?? "",
          amount: Number(p.netAmount ?? p.totalAmount ?? 0),
          paymentStatus: String(p.paymentStatus ?? "pending").toLowerCase(),
        }))
        .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    },
  });
}
// Date filter: `from`/`to` (either may be blank). A single date (from==to or
// only from) limits to that day.
function inRange(d: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  const t = new Date(d).setHours(0, 0, 0, 0);
  if (from && t < new Date(from).setHours(0, 0, 0, 0)) return false;
  const hi = to || from;
  if (hi && t > new Date(hi).setHours(0, 0, 0, 0)) return false;
  return true;
}
function InvoiceDateFilter({
  from, to, setFrom, setTo,
}: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400">From</span>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 dark:border-gray-700 dark:bg-gray-950" />
      <span className="text-gray-500 dark:text-gray-400">To</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 dark:border-gray-700 dark:bg-gray-950" />
      {(from || to) && (
        <button onClick={() => { setFrom(""); setTo(""); }} className="text-blue-600 hover:underline">Clear</button>
      )}
    </div>
  );
}
import type { Supplier } from "@/hooks/useSuppliers";

// --- helpers ---
function getBalanceColor(balance: number, creditLimit?: number, lastPurchase?: string) {
  if (balance === 0) return "text-green-600";
  if (lastPurchase) {
    const days = differenceInDays(new Date(), new Date(lastPurchase));
    if (days > 30) return "text-red-600";
  }
  if (!creditLimit) return "text-orange-500";
  const ratio = balance / creditLimit;
  if (ratio >= 0.8) return "text-red-600";
  if (ratio >= 0.5) return "text-yellow-600";
  return "text-orange-500";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// --- payment dialog ---
const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  method: z.enum(["Cash", "NEFT", "RTGS", "Cheque", "UPI"]),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

function RecordPaymentDialog({
  open,
  onOpenChange,
  supplierName,
  maxAmount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierName: string;
  maxAmount: number;
}) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      method: "NEFT",
      date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    console.log("Payment:", data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {supplierName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹) *</FormLabel>
                <FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl>
                <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding: ₹{maxAmount.toLocaleString()}</p>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="method" render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["Cash","NEFT","RTGS","Cheque","UPI"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference / Transaction ID</FormLabel>
                <FormControl><Input placeholder="TXN123456" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Supplier Detail Sheet ---
function SupplierDetailSheet({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { data: ledger = [], isLoading: ledgerLoading } = useSupplierLedger(
    open ? supplier.id : undefined
  );
  const { data: invoices = [], isLoading: invLoading } = useSupplierInvoices(supplier.id as string, open);
  const [pFrom, setPFrom] = useState(""); const [pTo, setPTo] = useState("");
  const [payFrom, setPayFrom] = useState(""); const [payTo, setPayTo] = useState("");
  const purchaseRows = invoices.filter((i) => inRange(i.date, pFrom, pTo));
  const paidRows = invoices.filter((i) => i.paymentStatus === "paid" && inRange(i.date, payFrom, payTo));

  const outstanding = (supplier.balance as number) ?? (supplier.outstandingBalance as number) ?? 0;
  const creditLimit = (supplier.creditLimit as number) ?? 0;
  const usageRatio = creditLimit > 0 ? outstanding / creditLimit : 0;
  const outstandingColor =
    outstanding === 0 ? "text-green-600" :
    usageRatio >= 0.8 ? "text-red-600" :
    usageRatio >= 0.5 ? "text-yellow-600" : "text-orange-500";

  const purchases: Array<{ id: string; date: string; amount: number; status: string; items?: string }> =
    (supplier.purchases as Array<{ id: string; date: string; amount: number; status: string; items?: string }>) ?? [];
  const payments: Array<{ id: string; date: string; amount: number; method: string; reference?: string }> =
    (supplier.paymentHistory as Array<{ id: string; date: string; amount: number; method: string; reference?: string }>) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle>{supplier.name}</SheetTitle>
              {supplier.gstin && (
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{supplier.gstin as string}</p>
              )}
            </div>
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <CreditCard className="w-4 h-4 mr-2" />Pay
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Outstanding prominent */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-2 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                <p className={`text-2xl font-bold ${outstandingColor}`}>₹{outstanding.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Credit Limit</p>
                <p className="text-2xl font-bold">{creditLimit > 0 ? `₹${creditLimit.toLocaleString()}` : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Terms</p>
                <p className="text-2xl font-bold">{(supplier.paymentTerms as string) ?? "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="text-sm space-y-1 text-gray-500 dark:text-gray-400">
            {supplier.phone && <p>Phone: {supplier.phone}</p>}
            {supplier.email && <p>Email: {supplier.email}</p>}
            {supplier.address && <p>Address: {supplier.address as string}</p>}
            {supplier.contactPerson && <p>Contact: {supplier.contactPerson as string}</p>}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="ledger">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* Ledger */}
            <TabsContent value="ledger" className="mt-3">
              {ledgerLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No ledger entries.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry) => (
                      <TableRow key={String(entry.id)}>
                        <TableCell>{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">{entry.description}</TableCell>
                        <TableCell className="text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="text-right text-green-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">₹{entry.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Purchases — all purchases, with a date-range filter */}
            <TabsContent value="purchases" className="mt-3">
              <InvoiceDateFilter from={pFrom} to={pTo} setFrom={setPFrom} setTo={setPTo} />
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
              ) : purchaseRows.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No purchases in this range.</p>
              ) : (
                <Table className="[&_td]:py-1.5 [&_td]:text-xs [&_th]:h-8 [&_th]:text-[11px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Sr No</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseRows.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-400">{i + 1}</TableCell>
                        <TableCell className="font-mono text-blue-600">{p.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(p.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold">₹{p.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.paymentStatus === "paid" ? "default" : p.paymentStatus === "partial" ? "secondary" : "outline"}>
                            {p.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Payments — paid bills only, with a date-range filter */}
            <TabsContent value="payments" className="mt-3">
              <InvoiceDateFilter from={payFrom} to={payTo} setFrom={setPayFrom} setTo={setPayTo} />
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
              ) : paidRows.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No paid bills in this range.</p>
              ) : (
                <Table className="[&_td]:py-1.5 [&_td]:text-xs [&_th]:h-8 [&_th]:text-[11px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Sr No</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidRows.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-400">{i + 1}</TableCell>
                        <TableCell className="font-mono text-blue-600">{p.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(p.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">₹{p.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <RecordPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          supplierName={supplier.name}
          maxAmount={outstanding}
        />
      </SheetContent>
    </Sheet>
  );
}

// --- table skeleton ---
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((__, j) => (
            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// --- Main Page ---
export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);

  const { data: paginatedData, isLoading, isError, refetch } = useSuppliers({ limit: 200 });
  const suppliers: Supplier[] = ((paginatedData as any)?.suppliers ?? paginatedData?.data ?? paginatedData) as unknown as Supplier[];
  const supplierList: Supplier[] = Array.isArray(suppliers) ? suppliers : [];

  const filtered = useMemo(() => {
    return supplierList.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        ((s.code as string) ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.gstin as string ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.phone ?? "").includes(search)
    );
  }, [supplierList, search]);

  const totalSuppliers = supplierList.length;
  const totalOutstanding = supplierList.reduce((sum, s) => {
    const bal = (s.balance as number) ?? (s.outstandingBalance as number) ?? 0;
    return sum + bal;
  }, 0);
  const dueThisWeek = supplierList.filter((s) => {
    const lastPurchase = s.lastPurchase as string | undefined;
    if (!lastPurchase) return false;
    const days = differenceInDays(new Date(), new Date(lastPurchase));
    return days >= 23 && days <= 30;
  }).reduce((sum, s) => {
    const bal = (s.balance as number) ?? (s.outstandingBalance as number) ?? 0;
    return sum + bal;
  }, 0);
  const totalPurchases = supplierList.reduce((sum, s) => {
    return sum + ((s.totalPurchases as number) ?? 0);
  }, 0);

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Suppliers"
        subtitle="Manage suppliers and outstanding payments"
        icon={Building2}
      />

      {/* Search (left) + actions (right end) on one line */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Refresh
        </Button>
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />Add Supplier
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Supplier</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SupplierForm
                onSuccess={() => {
                  setAddOpen(false);
                  refetch();
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {isError && (
        <ErrorNote>Failed to load suppliers. Please try again.</ErrorNote>
      )}

      {/* Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table className="[&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:text-[11px]">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <TableEmpty
                    icon={Building2}
                    title="No suppliers found"
                    description="Try adjusting your search, or add a new supplier."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((supplier) => {
                const outstanding = (supplier.balance as number) ?? (supplier.outstandingBalance as number) ?? 0;
                const lastPurchase = supplier.lastPurchase as string | undefined;
                const totalPurch = (supplier.totalPurchases as number) ?? 0;
                const contactPerson = (supplier.contactPerson as string) ?? "—";
                const daysOld = lastPurchase ? differenceInDays(new Date(), new Date(lastPurchase)) : 0;
                const isOverdue = outstanding > 0 && daysOld > 30;
                const balanceColor = getBalanceColor(outstanding, supplier.creditLimit as number | undefined, lastPurchase);

                return (
                  <TableRow key={String(supplier.id)} className="hover:bg-muted/30 dark:hover:bg-gray-800/50">
                    <TableCell className="font-mono text-gray-600 dark:text-gray-400">
                      {(supplier.code as string) || "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        className="font-medium hover:underline text-left text-blue-600"
                        onClick={() => setSelectedSupplier(supplier)}
                      >
                        {supplier.name}
                      </button>
                    </TableCell>
                    <TableCell>{supplier.phone ?? "—"}</TableCell>
                    <TableCell>{contactPerson}</TableCell>
                    <TableCell className="text-right font-medium">
                      {totalPurch > 0 ? `₹${totalPurch.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${balanceColor}`}>
                        ₹{outstanding.toLocaleString()}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">Overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit supplier" onClick={() => setEditSupplier(supplier)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" title="Delete supplier"
                          onClick={() => {
                            if (confirm(`Delete supplier "${supplier.name}"?`)) {
                              apiClient.delete(`/suppliers/${supplier.id}`)
                                .then(() => { toast.success("Supplier deleted."); refetch(); })
                                .catch((e: any) => toast.error(e?.response?.data?.message || "Could not delete supplier."));
                            }
                          }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Ledger" onClick={() => setSelectedSupplier(supplier)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="New Purchase" asChild>
                          <Link href={`/purchase?supplier=${supplier.id}`}>
                            <ShoppingCart className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Record Payment" onClick={() => setPaymentSupplier(supplier)}>
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </Panel>

      {/* Supplier detail slide-over */}
      {selectedSupplier && (
        <SupplierDetailSheet
          supplier={selectedSupplier}
          open={!!selectedSupplier}
          onOpenChange={(v) => { if (!v) setSelectedSupplier(null); }}
        />
      )}

      {/* Edit supplier slide-over */}
      <Sheet open={!!editSupplier} onOpenChange={(v) => { if (!v) setEditSupplier(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Supplier</SheetTitle>
          </SheetHeader>
          {editSupplier && (
            <div className="mt-4">
              <SupplierForm
                defaultValues={editSupplier as any}
                onSuccess={() => { setEditSupplier(null); refetch(); }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Comprehensive record-payment popup */}
      <SupplierPaymentDialog
        supplier={paymentSupplier}
        onClose={() => setPaymentSupplier(null)}
      />
    </PageContainer>
  );
}
