"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  User,
  Save,
  X,
  Wallet,
  Phone,
  Mail,
  Hash,
  Users,
  IndianRupee,
  Percent,
  CreditCard,
  MapPin,
  MessageCircle,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  FieldLabel,
  SearchInput,
  StatusTabs,
  TableEmpty,
  ds,
  type StatusTab,
} from "@/components/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

const MOCK_PATIENT = {
  id: "1",
  name: "Demo Patient",
  billAccount: "BA-1042",
  contact: "9876543210",
  email: "demo.patient@email.com",
  identifier: "AADHAAR-XXXX-1234",
  family: "Sharma Family",
  outstanding: 1250,
  discount: 5,
  creditLimit: 10000,
  gender: "Female",
  age: 58,
  address: "123, MG Road, Bengaluru, Karnataka",
  pincode: "560001",
  payment: "Cash",
  inHouse: false,
  avoidSms: false,
};

const ORDER_HISTORY = [
  {
    invoiceNo: "INV-001",
    date: new Date("2024-05-10"),
    doctor: "Dr. Anjali Singh",
    discount: 40,
    order: "Metformin, Amlodipine",
    payment: "Cash",
    total: 850,
  },
  {
    invoiceNo: "INV-002",
    date: new Date("2024-04-15"),
    doctor: "Dr. Ravi Patel",
    discount: 60,
    order: "Insulin, Aspirin",
    payment: "UPI",
    total: 1200,
  },
  {
    invoiceNo: "INV-003",
    date: new Date("2024-03-20"),
    doctor: "Dr. Anjali Singh",
    discount: 0,
    order: "Paracetamol, Vitamin D",
    payment: "Card",
    total: 450,
  },
];

const FREQ_ITEMS = [
  { name: "Metformin 500mg", times: 8, lastBought: new Date("2024-05-10") },
  { name: "Amlodipine 5mg", times: 6, lastBought: new Date("2024-05-10") },
  { name: "Insulin Glargine", times: 4, lastBought: new Date("2024-04-15") },
];

type TabKey = "orders" | "freq" | "tb" | "programs";

const TABS: StatusTab<TabKey>[] = [
  { key: "orders", label: "Order Details" },
  { key: "freq", label: "Freq. Bought Items" },
  { key: "tb", label: "TB Details" },
  { key: "programs", label: "Programs" },
];

export default function PatientProfilePage() {
  useParams();
  const [patient, setPatient] = useState(MOCK_PATIENT);
  const [tab, setTab] = useState<TabKey>("orders");
  const [historySearch, setHistorySearch] = useState("");

  const set = <K extends keyof typeof patient>(
    key: K,
    value: (typeof patient)[K]
  ) => setPatient((p) => ({ ...p, [key]: value }));

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return ORDER_HISTORY;
    return ORDER_HISTORY.filter(
      (h) =>
        h.invoiceNo.toLowerCase().includes(q) ||
        h.doctor.toLowerCase().includes(q) ||
        h.order.toLowerCase().includes(q)
    );
  }, [historySearch]);

  return (
    <PageContainer>
      <PageHeader
        title="Patient Profile"
        subtitle={`${patient.name} • ${patient.age}${patient.gender?.[0] ?? ""}`}
        icon={User}
        actions={
          <>
            <button
              className={cn(ds.btnPrimary, "bg-green-600 hover:bg-green-700")}
              onClick={() => toast.success("WhatsApp message sent")}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button
              className={ds.btnStrong}
              onClick={() => toast.success("Patient details saved")}
            >
              <Save className="h-4 w-4" /> Save
            </button>
            <button
              className={ds.btnOutline}
              onClick={() => window.history.back()}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        }
      />

      {/* ===== Field grid ===== */}
      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <FieldLabel icon={User}>Name</FieldLabel>
            <input
              className={ds.field}
              value={patient.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Wallet}>Bill Account</FieldLabel>
            <input
              className={ds.field}
              value={patient.billAccount}
              onChange={(e) => set("billAccount", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Phone}>Contact</FieldLabel>
            <input
              className={ds.field}
              value={patient.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Mail}>Email</FieldLabel>
            <input
              className={ds.field}
              value={patient.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Hash}>Identifier</FieldLabel>
            <input
              className={ds.field}
              value={patient.identifier}
              onChange={(e) => set("identifier", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Users}>Search Family</FieldLabel>
            <input
              className={ds.field}
              value={patient.family}
              onChange={(e) => set("family", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={IndianRupee}>Outstanding</FieldLabel>
            <input
              className={cn(ds.field, "font-semibold text-red-600")}
              value={formatCurrency(patient.outstanding)}
              readOnly
            />
          </div>
          <div>
            <FieldLabel icon={Percent}>Discount %</FieldLabel>
            <input
              type="number"
              className={ds.field}
              value={patient.discount}
              onChange={(e) => set("discount", Number(e.target.value))}
            />
          </div>
          <div>
            <FieldLabel icon={CreditCard}>Cr Limit</FieldLabel>
            <input
              type="number"
              className={ds.field}
              value={patient.creditLimit}
              onChange={(e) => set("creditLimit", Number(e.target.value))}
            />
          </div>
          <div>
            <FieldLabel>Gender</FieldLabel>
            <select
              className={ds.field}
              value={patient.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <FieldLabel>Age</FieldLabel>
            <input
              type="number"
              className={ds.field}
              value={patient.age}
              onChange={(e) => set("age", Number(e.target.value))}
            />
          </div>
          <div className="col-span-2">
            <FieldLabel icon={MapPin}>Address</FieldLabel>
            <input
              className={ds.field}
              value={patient.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={MapPin}>Pincode</FieldLabel>
            <input
              className={ds.field}
              value={patient.pincode}
              onChange={(e) => set("pincode", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel icon={Wallet}>Payment</FieldLabel>
            <select
              className={ds.field}
              value={patient.payment}
              onChange={(e) => set("payment", e.target.value)}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Credit</option>
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
              checked={patient.inHouse}
              onChange={(e) => set("inHouse", e.target.checked)}
            />
            In-house
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
              checked={patient.avoidSms}
              onChange={(e) => set("avoidSms", e.target.checked)}
            />
            Avoid SMS
          </label>
        </div>
      </Panel>

      {/* ===== Tabs + content ===== */}
      <Panel>
        <PanelBar>
          <StatusTabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === "orders" && (
            <SearchInput
              value={historySearch}
              onChange={setHistorySearch}
              placeholder="Search history..."
              className="w-64"
            />
          )}
        </PanelBar>

        {tab === "orders" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Discount (₹)</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <TableEmpty
                        title="No orders found"
                        description="Try a different search."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((h) => (
                    <TableRow key={h.invoiceNo}>
                      <TableCell className="font-mono font-medium text-blue-600">
                        {h.invoiceNo}
                      </TableCell>
                      <TableCell>{format(h.date, "dd MMM yyyy")}</TableCell>
                      <TableCell>{h.doctor}</TableCell>
                      <TableCell className="text-right">
                        {h.discount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-600">{h.order}</TableCell>
                      <TableCell>{h.payment}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(h.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {tab === "freq" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Times Bought</TableHead>
                  <TableHead>Last Bought</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FREQ_ITEMS.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-right">{f.times}</TableCell>
                    <TableCell>{format(f.lastBought, "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {tab === "tb" && (
          <TableEmpty
            title="No TB details"
            description="This patient has no TB programme records."
          />
        )}

        {tab === "programs" && (
          <TableEmpty
            title="No programs enrolled"
            description="This patient is not enrolled in any programmes."
          />
        )}
      </Panel>
    </PageContainer>
  );
}
