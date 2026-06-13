"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
} from "@/components/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, User, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const MOCK_PRESCRIPTION = {
  id: "RX-001",
  patient: { id: "1", name: "Rahul Sharma", phone: "9876543210", age: 45, bloodGroup: "O+" },
  doctor: { name: "Dr. Anjali Singh", registration: "MCI-12345", specialization: "General Physician", phone: "9988776655", clinic: "City Health Clinic" },
  date: new Date("2024-05-09"),
  status: "Used",
  fileUrl: null,
  linkedSales: [
    { invoiceId: "INV-001", date: new Date("2024-05-10"), amount: 850, items: "Metformin, Amlodipine" },
  ],
};

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const rx = MOCK_PRESCRIPTION;

  return (
    <PageContainer>
      <PageHeader
        title={`Prescription ${rx.id}`}
        subtitle={format(rx.date, "dd MMMM yyyy")}
        icon={FileText}
        actions={
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />Download
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Image/PDF Viewer */}
        <div className="lg:col-span-2">
          <Panel className="h-full overflow-hidden">
            <PanelBar>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Prescription Image</h2>
            </PanelBar>
            <div className="p-4">
              <div className="aspect-[3/4] bg-gray-50 dark:bg-gray-800/40 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">No image uploaded</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload prescription to view here</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* Side Panels */}
        <div className="space-y-4">
          {/* Patient Info */}
          <Panel className="overflow-hidden">
            <PanelBar>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <User className="w-4 h-4" />Patient
              </h2>
            </PanelBar>
            <div className="p-4 space-y-2 text-sm">
              <Link href={`/patients/${rx.patient.id}`} className="font-semibold text-blue-600 hover:underline block">
                {rx.patient.name}
              </Link>
              <p className="text-gray-500 dark:text-gray-400">{rx.patient.phone}</p>
              <div className="flex gap-2">
                <Badge variant="outline">{rx.patient.bloodGroup}</Badge>
                <Badge variant="secondary">{rx.patient.age} yrs</Badge>
              </div>
            </div>
          </Panel>

          {/* Doctor Info */}
          <Panel className="overflow-hidden">
            <PanelBar>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Stethoscope className="w-4 h-4" />Doctor
              </h2>
            </PanelBar>
            <div className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{rx.doctor.name}</p>
              <p className="text-gray-500 dark:text-gray-400">{rx.doctor.specialization}</p>
              <p className="text-gray-500 dark:text-gray-400">{rx.doctor.clinic}</p>
              <p className="text-gray-500 dark:text-gray-400">Reg: {rx.doctor.registration}</p>
              <p className="text-gray-500 dark:text-gray-400">{rx.doctor.phone}</p>
            </div>
          </Panel>

          {/* Status */}
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={rx.status === "Used" ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300" : "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300"}>
                {rx.status}
              </Badge>
            </div>
          </Panel>
        </div>
      </div>

      {/* Linked Sales */}
      {rx.linkedSales.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelBar>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Linked Sales</h2>
          </PanelBar>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rx.linkedSales.map((sale) => (
                  <TableRow key={sale.invoiceId}>
                    <TableCell className="font-mono text-blue-600">{sale.invoiceId}</TableCell>
                    <TableCell>{format(sale.date, "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">{sale.items}</TableCell>
                    <TableCell className="text-right font-semibold">₹{sale.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </PageContainer>
  );
}
