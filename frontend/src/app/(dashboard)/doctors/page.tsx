"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Edit, Trash2, Stethoscope, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
  TableEmpty,
  ErrorNote,
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
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor } from "@/hooks/useDoctors";
import type { Doctor } from "@/hooks/useDoctors";

// --- specializations list ---
const SPECIALIZATIONS = [
  "General Physician",
  "Cardiologist",
  "Diabetologist",
  "Dermatologist",
  "ENT Specialist",
  "Gastroenterologist",
  "Gynaecologist",
  "Neurologist",
  "Oncologist",
  "Ophthalmologist",
  "Orthopaedic Surgeon",
  "Paediatrician",
  "Psychiatrist",
  "Pulmonologist",
  "Urologist",
  "Other",
];

// --- schema ---
const doctorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  registration: z.string().min(2, "Registration number is required"),
  specialization: z.string().min(2, "Specialization is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  clinic: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  clinicAddress: z.string().optional(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

// --- form dialog ---
function DoctorFormDialog({
  open,
  onOpenChange,
  doctor,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctor?: Doctor | null;
  onSave: (data: DoctorFormValues, id?: string | number) => void;
  isSaving?: boolean;
}) {
  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: doctor
      ? {
          name: doctor.name,
          registration: (doctor.registration as string) ?? (doctor.licenseNo as string) ?? "",
          specialization: (doctor.specialization as string) ?? "",
          phone: (doctor.phone as string) ?? "",
          clinic: (doctor.clinic as string) ?? "",
          email: (doctor.email as string) ?? "",
          clinicAddress: (doctor.clinicAddress as string) ?? "",
        }
      : { name: "", registration: "", specialization: "", phone: "", clinic: "", email: "", clinicAddress: "" },
  });

  // Reset form when doctor changes
  const onSubmit = (data: DoctorFormValues) => {
    onSave(data, doctor?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doctor ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl><Input placeholder="Dr. Anjali Singh" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="registration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration # *</FormLabel>
                  <FormControl><Input placeholder="MCI-XXXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl><Input placeholder="9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="specialization" render={({ field }) => (
              <FormItem>
                <FormLabel>Specialization *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SPECIALIZATIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="doctor@hospital.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="clinic" render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic / Hospital Name</FormLabel>
                <FormControl><Input placeholder="City Hospital" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="clinicAddress" render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic Address</FormLabel>
                <FormControl><Input placeholder="123, MG Road, Bengaluru" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : doctor ? "Save Changes" : "Add Doctor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- table skeleton ---
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// --- Main Page ---
export default function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const { data: paginatedData, isLoading, isError } = useDoctors({ limit: 200 });
  // Backend returns { doctors, total, ... }; tolerate { data } / bare array too.
  const doctorList =
    (paginatedData as any)?.doctors ??
    (paginatedData as any)?.data ??
    paginatedData;
  const doctors: Doctor[] = Array.isArray(doctorList) ? doctorList : [];

  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();

  // Auto-open the Add Doctor dialog when arriving from Billing (?add=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("add") === "1") {
      setEditDoctor(null);
      setDialogOpen(true);
    }
  }, []);

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        d.name.toLowerCase().includes(q) ||
        ((d.specialization as string) ?? "").toLowerCase().includes(q) ||
        ((d.phone as string) ?? "").includes(q) ||
        ((d.registration as string) ?? "").toLowerCase().includes(q);
      const matchesSpec =
        !filterSpec ||
        filterSpec === "all" ||
        (d.specialization as string) === filterSpec;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, search, filterSpec]);

  // Stats
  const totalDoctors = doctors.length;
  const specializations = [...new Set(doctors.map((d) => d.specialization as string).filter(Boolean))];
  const topSpecialization = specializations.length > 0
    ? specializations.reduce((a, b) => {
        const aCount = doctors.filter((d) => d.specialization === a).length;
        const bCount = doctors.filter((d) => d.specialization === b).length;
        return aCount >= bCount ? a : b;
      })
    : "—";
  const totalPrescriptions = doctors.reduce((sum, d) => sum + ((d.prescriptionCount as number) ?? 0), 0);

  const handleSave = (data: DoctorFormValues, id?: string | number) => {
    // Backend expects `registrationNumber` (and `clinicAddress`); map the form
    // fields accordingly so the create/update doesn't 400.
    const payload = {
      name: data.name,
      registrationNumber: data.registration,
      specialization: data.specialization,
      phone: data.phone,
      clinicAddress: data.clinicAddress || data.clinic || "",
      registration: data.registration,
      licenseNo: data.registration,
    };
    if (id) {
      updateDoctor.mutate(
        { id, data: payload },
        { onSuccess: () => { setDialogOpen(false); setEditDoctor(null); } }
      );
    } else {
      createDoctor.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string | number) => {
    deleteDoctor.mutate(id, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const isSaving = createDoctor.isPending || updateDoctor.isPending;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Doctors"
        subtitle="Manage referring doctors and prescribers"
        icon={Stethoscope}
        actions={
          <Button
            size="sm"
            onClick={() => { setEditDoctor(null); setDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />Add Doctor
          </Button>
        }
      />

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, reg#, specialization..."
          className="flex-1 min-w-[200px] max-w-sm"
        />
        <Select value={filterSpec} onValueChange={setFilterSpec}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Specializations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specializations</SelectItem>
            {SPECIALIZATIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <ErrorNote>Failed to load doctors. Please try again.</ErrorNote>
      )}

      {/* Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reg #</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Clinic / Hospital</TableHead>
              <TableHead>Prescriptions</TableHead>
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
                    icon={Stethoscope}
                    title="No doctors found"
                    description="Try adjusting your search or filter, or add a new doctor."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doctor) => (
                <TableRow key={String(doctor.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="font-medium">{doctor.name}</p>
                        {doctor.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />{doctor.email as string}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {(doctor.registration as string) ?? (doctor.licenseNo as string) ?? "—"}
                  </TableCell>
                  <TableCell>
                    {doctor.specialization ? (
                      <Badge variant="secondary">{doctor.specialization as string}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {doctor.phone ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-gray-500 dark:text-gray-400" />{doctor.phone as string}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {doctor.clinic && <p>{doctor.clinic as string}</p>}
                      {doctor.clinicAddress && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{doctor.clinicAddress as string}</p>
                      )}
                      {!doctor.clinic && !doctor.clinicAddress && <span className="text-gray-500 dark:text-gray-400">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{(doctor.prescriptionCount as number) ?? 0} Rx</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditDoctor(doctor); setDialogOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(doctor.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Panel>

      {/* Add / Edit dialog */}
      <DoctorFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditDoctor(null); }}
        doctor={editDoctor}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this doctor? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId != null && handleDelete(deleteId)}
              disabled={deleteDoctor.isPending}
            >
              {deleteDoctor.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
