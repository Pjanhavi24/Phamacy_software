"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Star, Users, FileText, LayoutGrid, List, Phone, Mail, MapPin, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  SearchInput,
  TableEmpty,
  ErrorNote,
} from "@/components/design-system";
import { PatientForm } from "@/components/patients/patient-form";
import { useCustomers, useCustomerHistory, useCustomerPrescriptions } from "@/hooks/useCustomers";
import type { Customer } from "@/hooks/useCustomers";
import { format } from "date-fns";

// --- helpers ---
function safeDate(value: unknown, fmt = "dd MMM yyyy") {
  if (!value) return "—";
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? "—" : format(d, fmt);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const BG_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
];
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % BG_COLORS.length;
  return BG_COLORS[idx];
}

// --- Patient detail slide-over ---
function PatientDetailSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: Customer;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: history = [], isLoading: histLoading } = useCustomerHistory(
    open ? patient.id : undefined
  );
  const { data: prescriptions, isLoading: rxLoading } = useCustomerPrescriptions(
    open ? patient.id : undefined
  );

  const allergies: string[] = (patient.allergies as string[]) ?? [];
  const chronicDiseases: string[] = (patient.chronicDiseases as string[]) ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Patient Profile</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 ${avatarColor(patient.name)}`}
            >
              {getInitials(patient.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{patient.name}</h2>
              {patient.customerCode && (
                <p className="text-xs font-mono text-blue-600">
                  {patient.customerCode as string}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {patient.bloodGroup && (
                  <Badge variant="outline">{patient.bloodGroup as string}</Badge>
                )}
                {patient.gender && (
                  <Badge variant="secondary">{patient.gender as string}</Badge>
                )}
                {patient.age && (
                  <Badge variant="secondary">{patient.age as number} yrs</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />{patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />{patient.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="history">Purchases</TabsTrigger>
              <TabsTrigger value="prescriptions">Rx</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="mt-3 space-y-3">
              {patient.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <span>{patient.address as string}</span>
                </div>
              )}
              {allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {allergies.map((a) => (
                      <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {chronicDiseases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Chronic Diseases</p>
                  <div className="flex flex-wrap gap-1">
                    {chronicDiseases.map((d) => (
                      <Badge key={d} className="text-xs bg-orange-100 dark:bg-orange-950/40 text-orange-800 border-orange-300 dark:border-gray-700">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {patient.doctor && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Primary Doctor: </span>
                  <span className="font-medium">{patient.doctor as string}</span>
                </div>
              )}
            </TabsContent>

            {/* Purchase History Tab */}
            <TabsContent value="history" className="mt-3">
              {histLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No purchase history.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={String(item.id)} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-mono text-sm text-blue-600">{String(item.id)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{safeDate(item.date)}</p>
                      </div>
                      <p className="font-semibold">₹{item.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Prescriptions Tab */}
            <TabsContent value="prescriptions" className="mt-3">
              {rxLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : prescriptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No prescriptions uploaded.</p>
              ) : (
                <div className="divide-y rounded-md border">
                  {prescriptions.map((rx) => {
                    const isPdf = (rx.imageUrl ?? "").toLowerCase().endsWith(".pdf");
                    return (
                      <a
                        key={rx.id}
                        href={rx.imageUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {rx.imageUrl && !isPdf ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rx.imageUrl} alt="Prescription" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {rx.doctor?.name ?? "Prescription"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {safeDate(rx.prescriptionDate)}
                            {rx.status ? ` · ${rx.status}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-blue-600 shrink-0">View</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Patient Card ---
function PatientCard({
  patient,
  onClick,
}: {
  patient: Customer;
  onClick: () => void;
}) {
  const allergies: string[] = (patient.allergies as string[]) ?? [];
  const chronicDiseases: string[] = (patient.chronicDiseases as string[]) ?? [];
  const lastVisit: string | undefined = patient.lastVisit as string | undefined;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${avatarColor(patient.name)}`}
          >
            {getInitials(patient.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-semibold truncate">{patient.name}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{patient.phone}</p>
            {patient.customerCode && (
              <p className="text-[11px] font-mono text-blue-600 mt-0.5">
                {patient.customerCode as string}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {patient.bloodGroup && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">{patient.bloodGroup as string}</Badge>
              )}
              {patient.gender && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{patient.gender as string}</Badge>
              )}
              {patient.age && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{patient.age as number}y</Badge>
              )}
            </div>
            {chronicDiseases.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {chronicDiseases.slice(0, 2).map((d) => (
                  <Badge key={d} className="text-xs px-1.5 py-0 bg-orange-100 dark:bg-orange-950/40 text-orange-800 border-orange-300 dark:border-gray-700">{d}</Badge>
                ))}
                {chronicDiseases.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">+{chronicDiseases.length - 2}</Badge>
                )}
              </div>
            )}
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {allergies.slice(0, 2).map((a) => (
                  <Badge key={a} variant="destructive" className="text-xs px-1.5 py-0">{a}</Badge>
                ))}
              </div>
            )}
            {lastVisit && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Last visit: {safeDate(lastVisit)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Customer | null>(null);

  // Auto-open the Add Patient form when arriving from Billing (?add=1&name=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("add") === "1") {
      setPrefillName(sp.get("name") ?? "");
      setAddOpen(true);
    }
  }, []);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [filterBloodGroup, setFilterBloodGroup] = useState("");
  const [filterDisease, setFilterDisease] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: paginatedData, isLoading, isError } = useCustomers({ limit: 200 });
  const customers: Customer[] = paginatedData?.data ?? [];

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q);

      const matchesBloodGroup =
        !filterBloodGroup ||
        filterBloodGroup === "all" ||
        (c.bloodGroup as string) === filterBloodGroup;

      const chronicDiseases: string[] = (c.chronicDiseases as string[]) ?? [];
      const matchesDisease =
        !filterDisease ||
        filterDisease === "all" ||
        chronicDiseases.some((d) => d.toLowerCase().includes(filterDisease.toLowerCase()));

      return matchesSearch && matchesBloodGroup && matchesDisease;
    });
  }, [customers, search, filterBloodGroup, filterDisease]);

  const hasActiveFilters = filterBloodGroup || filterDisease;

  return (
    <PageContainer>
      {/* Page header */}
      <PageHeader
        title="Patients"
        subtitle="Manage your patient / customer records"
        icon={Users}
        actions={
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />Add Patient
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add New Patient</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <PatientForm
                  defaultValues={prefillName ? { name: prefillName } : undefined}
                  onSuccess={() => setAddOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Search + filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, email..."
          className="flex-1 min-w-[200px] max-w-sm"
        />
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="w-4 h-4 mr-2" />Filters
          {hasActiveFilters && (
            <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full">
              !
            </Badge>
          )}
        </Button>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <Panel className="flex flex-wrap gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Blood Group</label>
            <Select value={filterBloodGroup} onValueChange={setFilterBloodGroup}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Disease</label>
            <Input
              className="h-8 w-36"
              placeholder="e.g. Diabetes"
              value={filterDisease}
              onChange={(e) => setFilterDisease(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterBloodGroup(""); setFilterDisease(""); }}
            >
              <X className="w-4 h-4 mr-1" />Clear
            </Button>
          )}
        </Panel>
      )}

      {isError && (
        <ErrorNote>Failed to load patients. Please try again.</ErrorNote>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Panel className="overflow-hidden">
            <TableEmpty
              icon={Users}
              title="No patients found"
              description="Try adjusting your search or filter."
            />
          </Panel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((patient) => (
              <PatientCard
                key={String(patient.id)}
                patient={patient}
                onClick={() => setSelectedPatient(patient)}
              />
            ))}
          </div>
        )
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Conditions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <TableEmpty
                      icon={Users}
                      title="No patients found"
                      description="Try adjusting your search or filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((patient) => {
                  const chronicDiseases: string[] = (patient.chronicDiseases as string[]) ?? [];
                  return (
                    <TableRow
                      key={String(patient.id)}
                      className="cursor-pointer hover:bg-muted/50 dark:hover:bg-gray-800/50"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <TableCell className="font-mono text-xs text-blue-600">
                        {(patient.customerCode as string) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(patient.name)}`}>
                            {getInitials(patient.name)}
                          </div>
                          <span className="font-medium">{patient.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>
                        {patient.age ? `${patient.age as number}y` : "—"}
                        {patient.gender ? ` / ${patient.gender as string}` : ""}
                      </TableCell>
                      <TableCell>
                        {patient.bloodGroup ? (
                          <Badge variant="outline">{patient.bloodGroup as string}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {chronicDiseases.slice(0, 2).map((d) => (
                            <Badge key={d} className="text-xs px-1 py-0 bg-orange-100 dark:bg-orange-950/40 text-orange-800 border-orange-300 dark:border-gray-700">{d}</Badge>
                          ))}
                          {chronicDiseases.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">+{chronicDiseases.length - 2}</Badge>
                          )}
                          {chronicDiseases.length === 0 && <span className="text-gray-500 dark:text-gray-400">—</span>}
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
      )}

      {/* Patient detail slide-over */}
      {selectedPatient && (
        <PatientDetailSheet
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(v) => { if (!v) setSelectedPatient(null); }}
        />
      )}
    </PageContainer>
  );
}
