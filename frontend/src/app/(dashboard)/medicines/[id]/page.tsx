"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Printer,
  QrCode,
  Package,
  TrendingUp,
  Info,
  Pill,
} from "lucide-react";
import { MedicineForm } from "@/components/medicines/medicine-form";
import {
  PageContainer,
  Spinner,
} from "@/components/design-system";

// ---- Types ----
interface Batch {
  batchNo: string;
  mfgDate: string;
  expDate: string;
  qty: number;
  purchaseRate: number;
  mrp: number;
  supplier: string;
}

interface StockMovement {
  date: string;
  in: number;
  out: number;
  balance: number;
}

interface MedicineDetail {
  id: string;
  name: string;
  genericName: string;
  salt: string;
  brand: string;
  manufacturer: string;
  category: string;
  barcode: string;
  hsnCode: string;
  scheduleType: string;
  gstRate: number;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  margin: number;
  minLevel: number;
  maxLevel: number;
  reorderLevel: number;
  unitsPerPack: number;
  unit: string;
  storageInstructions: string;
  isActive: boolean;
  totalStock: number;
  batches: Batch[];
  stockMovements: StockMovement[];
}

// ---- Mock fetch ----
function useMedicineDetail(id: string): { data: MedicineDetail | null; loading: boolean } {
  const [data, setData] = useState<MedicineDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        id,
        name: "Amoxicillin 500mg",
        genericName: "Amoxicillin",
        salt: "Amoxicillin Trihydrate",
        brand: "Mox",
        manufacturer: "Sun Pharma",
        category: "Antibiotic",
        barcode: "8901234567891",
        hsnCode: "30041090",
        scheduleType: "H",
        gstRate: 12,
        mrp: 30,
        purchaseRate: 18,
        saleRate: 28,
        margin: 35.7,
        minLevel: 20,
        maxLevel: 500,
        reorderLevel: 50,
        unitsPerPack: 10,
        unit: "Strip",
        storageInstructions: "Store below 25°C. Keep away from moisture and sunlight.",
        isActive: true,
        totalStock: 120,
        batches: [
          { batchNo: "SPA24001", mfgDate: "2024-01-01", expDate: "2026-01-01", qty: 60, purchaseRate: 18, mrp: 30, supplier: "Medico Distributors" },
          { batchNo: "SPA24002", mfgDate: "2024-03-01", expDate: "2026-03-01", qty: 40, purchaseRate: 18.5, mrp: 30, supplier: "Apollo Pharma" },
          { batchNo: "SPA24003", mfgDate: "2024-06-01", expDate: "2026-06-01", qty: 20, purchaseRate: 19, mrp: 32, supplier: "Medico Distributors" },
        ],
        stockMovements: Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          const inQty = i % 7 === 0 ? Math.floor(Math.random() * 50) + 20 : 0;
          const outQty = Math.floor(Math.random() * 15) + 2;
          return {
            date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
            in: inQty,
            out: outQty,
            balance: 80 + i * 2 + inQty - outQty,
          };
        }),
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  return { data, loading };
}

// ---- Barcode / QR placeholder ----
function BarcodeDisplay({ barcode }: { barcode: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-white dark:bg-gray-900">
      {/* Barcode stripes placeholder */}
      <div className="flex items-end gap-[2px] h-16">
        {barcode.split("").map((char, i) => (
          <div
            key={i}
            className="bg-black"
            style={{ width: i % 3 === 0 ? 3 : 2, height: i % 5 === 0 ? 64 : i % 3 === 0 ? 56 : 48 }}
          />
        ))}
      </div>
      <span className="font-mono text-sm tracking-widest">{barcode}</span>
    </div>
  );
}

function QRDisplay({ value }: { value: string }) {
  // Render a simple grid as a QR placeholder
  const size = 10;
  const cells = Array.from({ length: size * size }, (_, i) => (i + Math.floor(i / size)) % 2 === 0);
  return (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-white dark:bg-gray-900">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 120, height: 120 }}
      >
        {cells.map((filled, i) => (
          <div key={i} className={filled ? "bg-black" : "bg-white"} />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{value.slice(0, 20)}...</span>
    </div>
  );
}

export default function MedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: med, loading } = useMedicineDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <PageContainer>
        <Spinner />
      </PageContainer>
    );
  }

  if (!med)
    return (
      <PageContainer>
        <p className="text-sm text-gray-500 dark:text-gray-400">Medicine not found.</p>
      </PageContainer>
    );

  const expiringSoon = med.batches.filter((b) => {
    const diff = (new Date(b.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 90;
  });

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <Pill className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{med.name}</h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{med.genericName} · {med.manufacturer}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Print Label
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />Edit
          </Button>
        </div>
      </div>

      {/* Expiry alert */}
      {expiringSoon.length > 0 && (
        <Card className="border-orange-400 border-l-4">
          <CardContent className="py-3 flex items-center gap-3">
            <span className="text-orange-500 font-semibold">
              {expiringSoon.length} batch(es) expiring within 90 days!
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><Info className="h-4 w-4 mr-1" />Details</TabsTrigger>
          <TabsTrigger value="batches"><Package className="h-4 w-4 mr-1" />Batches</TabsTrigger>
          <TabsTrigger value="movement"><TrendingUp className="h-4 w-4 mr-1" />Stock Movement</TabsTrigger>
          <TabsTrigger value="barcode"><QrCode className="h-4 w-4 mr-1" />Barcode / QR</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Brand Name", med.brand],
                  ["Salt / Composition", med.salt],
                  ["Manufacturer", med.manufacturer],
                  ["Category", med.category],
                  ["Unit", med.unit],
                  ["Units Per Pack", med.unitsPerPack],
                  ["HSN Code", med.hsnCode],
                  ["Barcode", med.barcode],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pricing & GST</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["MRP", `₹${med.mrp}`],
                  ["Purchase Rate", `₹${med.purchaseRate}`],
                  ["Sale Rate", `₹${med.saleRate}`],
                  ["Margin", `${med.margin.toFixed(2)}%`],
                  ["GST Rate", `${med.gstRate}%`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Stock Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Min Level", med.minLevel],
                  ["Max Level", med.maxLevel],
                  ["Reorder Level", med.reorderLevel],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Storage</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p className="text-gray-500 dark:text-gray-400">{med.storageInstructions}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Batch-wise Stock</CardTitle>
              <CardDescription>{med.batches.length} active batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Mfg. Date</TableHead>
                      <TableHead>Exp. Date</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Purchase Rate</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {med.batches.map((b) => {
                      const daysToExp = Math.ceil((new Date(b.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={b.batchNo}>
                          <TableCell className="font-mono">{b.batchNo}</TableCell>
                          <TableCell>{new Date(b.mfgDate).toLocaleDateString("en-IN")}</TableCell>
                          <TableCell>
                            <span className={daysToExp <= 90 ? "text-orange-600 font-semibold" : ""}>
                              {new Date(b.expDate).toLocaleDateString("en-IN")}
                            </span>
                            {daysToExp <= 90 && <Badge className="ml-2 bg-orange-100 dark:bg-orange-950/40 text-orange-700 border-orange-300 dark:border-gray-700" variant="outline">Expiring Soon</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{b.qty}</TableCell>
                          <TableCell className="text-right">₹{b.purchaseRate}</TableCell>
                          <TableCell className="text-right">₹{b.mrp}</TableCell>
                          <TableCell>{b.supplier}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movement Tab */}
        <TabsContent value="movement">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No analytics to display.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barcode Tab */}
        <TabsContent value="barcode">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Barcode</CardTitle>
                <CardDescription>EAN-13 / Code-128</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4" ref={printRef}>
                <BarcodeDisplay barcode={med.barcode} />
                <div className="text-center">
                  <div className="font-semibold">{med.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">MRP: ₹{med.mrp}</div>
                </div>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />Print Barcode
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>Scan for medicine details</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <QRDisplay value={`MEDICINE:${med.id}:${med.name}:${med.barcode}`} />
                <div className="text-center">
                  <div className="font-semibold">{med.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{med.barcode}</div>
                </div>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />Print QR Code
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          <MedicineForm
            defaultValues={med}
            onSubmit={(values) => {
              console.log("Updated:", values);
              setEditOpen(false);
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
