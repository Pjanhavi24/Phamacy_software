"use client";

import { useState } from "react";
import { Filter, Eye, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { format } from "date-fns";

const MOCK_PRESCRIPTIONS = [
  {
    id: "RX-001",
    patient: "Rahul Sharma",
    patientId: "1",
    doctor: "Dr. Anjali Singh",
    date: new Date("2024-05-09"),
    status: "Used",
  },
  {
    id: "RX-002",
    patient: "Priya Mehta",
    patientId: "2",
    doctor: "Dr. Ravi Patel",
    date: new Date("2024-05-17"),
    status: "Pending",
  },
  {
    id: "RX-003",
    patient: "Anil Kumar",
    patientId: "3",
    doctor: "Dr. Neeraj Verma",
    date: new Date("2024-04-29"),
    status: "Expired",
  },
];

const DOCTORS = ["Dr. Anjali Singh", "Dr. Ravi Patel", "Dr. Neeraj Verma"];

const STATUS_COLORS: Record<string, string> = {
  Used: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
  Pending: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300",
  Expired: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
};

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");

  const filtered = MOCK_PRESCRIPTIONS.filter((rx) => {
    const matchSearch = rx.patient.toLowerCase().includes(search.toLowerCase());
    const matchDoctor = doctorFilter === "all" || rx.doctor === doctorFilter;
    return matchSearch && matchDoctor;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Prescriptions"
        subtitle="Manage uploaded prescriptions"
        icon={FileText}
      />

      <Panel className="overflow-hidden">
        <PanelBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by patient name..."
            className="w-full max-w-sm"
          />
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {DOCTORS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelBar>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rx #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="font-mono text-blue-600">{rx.id}</TableCell>
                  <TableCell>
                    <Link href={`/patients/${rx.patientId}`} className="hover:underline font-medium">
                      {rx.patient}
                    </Link>
                  </TableCell>
                  <TableCell>{rx.doctor}</TableCell>
                  <TableCell>{format(rx.date, "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[rx.status]}`}>
                      {rx.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/prescriptions/${rx.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Use in Billing">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <TableEmpty
                      icon={FileText}
                      title="No prescriptions found"
                      description="Try adjusting your search or filter."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageContainer>
  );
}
