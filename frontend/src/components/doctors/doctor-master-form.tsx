"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Stethoscope,
  BadgeCheck,
  Phone,
  Mail,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ds, FieldLabel } from "@/components/design-system";
import { useCreateDoctor } from "@/hooks/useDoctors";
import { SPECIALIZATIONS } from "@/components/doctors/doctor-form";

/**
 * Doctor master-entry form — styled for the right-side SlideOver. Same
 * useCreateDoctor contract as the original DoctorForm (registration → licenseNo).
 */

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  registration: z.string().min(2, "Registration number is required"),
  specialization: z.string().min(2, "Specialization is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  clinic: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  clinicAddress: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export interface DoctorMasterFormProps {
  defaultValues?: Partial<Values>;
  onSuccess?: (created?: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function DoctorMasterForm({
  defaultValues,
  onSuccess,
  onCancel,
}: DoctorMasterFormProps) {
  const createDoctor = useCreateDoctor();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
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

  const onSubmit = async (data: Values) => {
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
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add doctor";
      toast.error(message);
    }
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const err = (k: keyof Values) =>
    errors[k] ? (
      <p className="mt-0.5 text-[11px] font-medium text-red-600">
        {errors[k]?.message as string}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2">
          <FieldLabel icon={Stethoscope}>Full Name</FieldLabel>
          <input className={ds.field} placeholder="Dr. Anjali Singh" {...register("name")} />
          {err("name")}
        </div>

        <div>
          <FieldLabel icon={BadgeCheck}>Registration #</FieldLabel>
          <input className={ds.field} placeholder="MCI-XXXXX" {...register("registration")} />
          {err("registration")}
        </div>
        <div>
          <FieldLabel icon={Phone}>Phone</FieldLabel>
          <input className={ds.field} placeholder="9876543210" {...register("phone")} />
          {err("phone")}
        </div>

        <div className="col-span-2">
          <FieldLabel icon={Stethoscope}>Specialization</FieldLabel>
          <select className={cn(ds.field, "appearance-none")} {...register("specialization")}>
            <option value="">Select specialization</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {err("specialization")}
        </div>

        <div className="col-span-2">
          <FieldLabel icon={Mail}>Email</FieldLabel>
          <input className={ds.field} placeholder="doctor@hospital.com" {...register("email")} />
          {err("email")}
        </div>

        <div className="col-span-2">
          <FieldLabel icon={Building2}>Clinic / Hospital Name</FieldLabel>
          <input className={ds.field} placeholder="City Hospital" {...register("clinic")} />
        </div>

        <div className="col-span-2">
          <FieldLabel icon={MapPin}>Clinic Address</FieldLabel>
          <input className={ds.field} placeholder="123, MG Road, Bengaluru" {...register("clinicAddress")} />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3">
        <button type="button" className={ds.btnOutline} onClick={onCancel}>
          Cancel
          <kbd className="ml-1 rounded border border-gray-300 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">
            ESC
          </kbd>
        </button>
        <button type="submit" className={ds.btnStrong} disabled={createDoctor.isPending}>
          {createDoctor.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Doctor
          <kbd className="ml-1 rounded border border-white/30 bg-white/10 px-1 font-mono text-[10px]">
            CTRL+S
          </kbd>
        </button>
      </div>
    </form>
  );
}
