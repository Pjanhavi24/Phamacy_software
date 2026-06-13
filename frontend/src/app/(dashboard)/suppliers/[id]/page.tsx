"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";
import { Building2, CreditCard } from "lucide-react";

const MOCK_SUPPLIER = {
  id: "1",
  name: "MedLine Pharma Distributors",
  gstin: "29ABCDE1234F1Z5",
  phone: "9876543200",
  email: "billing@medline.com",
  address: "Plot 45, Industrial Area, Bengaluru 560099",
  outstandingBalance: 45000,
  creditLimit: 100000,
  paymentTerms: "30 days",
};

const PURCHASES = [
  { id: "PO-001", date: new Date("2024-05-12"), items: "Metformin, Insulin", amount: 25000, status: "Received" },
  { id: "PO-002", date: new Date("2024-04-20"), items: "Amlodipine, Aspirin", amount: 18000, status: "Received" },
  { id: "PO-003", date: new Date("2024-03-15"), items: "Vitamin D, Calcium", amount: 12000, status: "Partial" },
];

const PAYMENTS = [
  { id: "PAY-001", date: new Date("2024-05-15"), amount: 10000, method: "NEFT", reference: "TXN123456" },
  { id: "PAY-002", date: new Date("2024-04-25"), amount: 15000, method: "Cheque", reference: "CHQ-7890" },
];

const CREDIT_DEBIT_NOTES = [
  { id: "CN-001", date: new Date("2024-05-10"), type: "Credit", amount: 2000, reason: "Returned expired medicines" },
  { id: "DN-001", date: new Date("2024-04-18"), type: "Debit", amount: 500, reason: "Short supply" },
];

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  method: z.enum(["Cash", "NEFT", "RTGS", "Cheque", "UPI"]),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function RecordPaymentDialog({
  open,
  onOpenChange,
  maxAmount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maxAmount: number;
}) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      method: "NEFT",
      date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    console.log("Payment recorded:", data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹) *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter amount" {...field} />
                  </FormControl>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding: ₹{maxAmount.toLocaleString()}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Cash", "NEFT", "RTGS", "Cheque", "UPI"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference / Transaction ID</FormLabel>
                  <FormControl>
                    <Input placeholder="TXN123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

export default function SupplierLedgerPage() {
  const { id } = useParams();
  const supplier = MOCK_SUPPLIER;
  const [paymentOpen, setPaymentOpen] = useState(false);

  const usageRatio = supplier.outstandingBalance / supplier.creditLimit;
  const outstandingColor =
    supplier.outstandingBalance === 0
      ? "text-green-600"
      : usageRatio >= 0.8
      ? "text-red-600"
      : usageRatio >= 0.5
      ? "text-yellow-600"
      : "text-orange-500";

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={supplier.name}
        subtitle={supplier.gstin}
        icon={Building2}
        actions={
          <Button onClick={() => setPaymentOpen(true)}>
            <CreditCard className="w-4 h-4 mr-2" />Record Payment
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="purchases">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="notes">Credit/Debit Notes</TabsTrigger>
        </TabsList>

        {/* Purchases */}
        <TabsContent value="purchases" className="mt-4">
          <Panel className="overflow-hidden">
            <PanelBar>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Purchase History</h2>
            </PanelBar>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PURCHASES.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-blue-600">{po.id}</TableCell>
                      <TableCell>{format(po.date, "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{po.items}</TableCell>
                      <TableCell>
                        <Badge variant={po.status === "Received" ? "default" : "secondary"}>{po.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">₹{po.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <Panel className="overflow-hidden">
            <PanelBar>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payment History</h2>
            </PanelBar>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAYMENTS.map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-mono text-blue-600">{pay.id}</TableCell>
                      <TableCell>{format(pay.date, "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant="outline">{pay.method}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{pay.reference}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">₹{pay.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>

        {/* Credit/Debit Notes */}
        <TabsContent value="notes" className="mt-4">
          <Panel className="overflow-hidden">
            <PanelBar>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Credit / Debit Notes</h2>
            </PanelBar>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CREDIT_DEBIT_NOTES.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-mono text-blue-600">{note.id}</TableCell>
                      <TableCell>{format(note.date, "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={note.type === "Credit" ? "default" : "destructive"}>{note.type}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{note.reason}</TableCell>
                      <TableCell className={`text-right font-semibold ${note.type === "Credit" ? "text-green-600" : "text-red-600"}`}>
                        {note.type === "Credit" ? "-" : "+"}₹{note.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        maxAmount={supplier.outstandingBalance}
      />
    </PageContainer>
  );
}
