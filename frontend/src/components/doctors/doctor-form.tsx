"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateDoctor } from "@/hooks/useDoctors";

// Keep this list in sync with the Doctors master page.
export const SPECIALIZATIONS = [
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

interface DoctorFormProps {
  defaultValues?: Partial<DoctorFormValues>;
  // Receives the newly created doctor record so callers (e.g. the billing
  // screen) can immediately select it.
  onSuccess?: (created?: Record<string, unknown>) => void;
}

export function DoctorForm({ defaultValues, onSuccess }: DoctorFormProps) {
  const createDoctor = useCreateDoctor();
  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: "",
      registration: "",
      specialization: "",
      phone: "",
      clinic: "",
      email: "",
      clinicAddress: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (data: DoctorFormValues) => {
    try {
      const created = (await createDoctor.mutateAsync({
        ...data,
        email: data.email || undefined,
        licenseNo: data.registration,
      })) as Record<string, unknown>;
      toast.success("Doctor added");
      onSuccess?.(created);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add doctor";
      toast.error(message);
    }
  };

  return (
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

        <Button type="submit" className="w-full" disabled={createDoctor.isPending}>
          {createDoctor.isPending ? "Saving..." : "Save Doctor"}
        </Button>
      </form>
    </Form>
  );
}
