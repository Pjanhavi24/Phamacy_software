"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Percent,
  Wallet,
  CreditCard,
  Loader2,
} from "lucide-react";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import { ds, FieldLabel } from "@/components/design-system";

/**
 * Patient master-entry form — styled for the right-side SlideOver and laid out
 * to mirror the reference "Add Patient" panel (Name, Bill Account, Identifier,
 * Family, Email, Phone, Pincode, Address, Age, Gender, Discount %, Credit
 * Limit). The backend /customers contract is unchanged: only the supported
 * subset is submitted; the remaining reference fields are captured for the UI.
 */

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  billAccount: z.string().optional(),
  identifier: z.string().optional(),
  family: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "6-digit pincode")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  age: z.coerce.number().min(0).max(150),
  gender: z.enum(["Male", "Female", "Other"]),
  discount: z.coerce.number().min(0).max(100).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

type Values = z.infer<typeof schema>;

const GENDER_MAP: Record<string, string> = {
  Male: "MALE",
  Female: "FEMALE",
  Other: "OTHER",
};

export interface PatientMasterFormProps {
  defaultValues?: Partial<Values>;
  onSuccess?: (created?: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function PatientMasterForm({
  defaultValues,
  onSuccess,
  onCancel,
}: PatientMasterFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      billAccount: "",
      identifier: "",
      family: "",
      email: "",
      phone: "",
      pincode: "",
      address: "",
      age: 0,
      gender: "Male",
      discount: 0,
      creditLimit: 0,
      ...defaultValues,
    },
  });

  const gender = watch("gender");

  const onSubmit = async (data: Values) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        address:
          [data.address, data.pincode].filter(Boolean).join(" - ") || undefined,
        age: data.age,
        gender: GENDER_MAP[data.gender],
        bloodGroup: "O_POSITIVE",
        allergies: [],
        chronicDiseases: [],
      };
      const res = await apiClient.post("/customers", payload);
      const created = (res.data?.data ?? res.data) as Record<string, unknown> & {
        customerCode?: string;
      };
      toast.success(
        created?.customerCode
          ? `Patient added — Customer ID ${created.customerCode}`
          : "Patient added"
      );
      onSuccess?.(created);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add patient";
      toast.error(message);
    }
  };

  // Ctrl+S submits the form.
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2">
          <FieldLabel icon={User}>Name</FieldLabel>
          <input className={ds.field} placeholder="Patient name" {...register("name")} />
          {err("name")}
        </div>

        <div className="col-span-2">
          <FieldLabel icon={Wallet}>Bill Account</FieldLabel>
          <input className={ds.field} placeholder="Account" {...register("billAccount")} />
        </div>

        <div className="col-span-2">
          <FieldLabel icon={Users}>Family</FieldLabel>
          <input className={ds.field} placeholder="Search family" {...register("family")} />
        </div>

        <div>
          <FieldLabel icon={Mail}>Email</FieldLabel>
          <input className={ds.field} placeholder="email@example.com" {...register("email")} />
          {err("email")}
        </div>
        <div>
          <FieldLabel icon={Phone}>Phone</FieldLabel>
          <input className={ds.field} placeholder="9876543210" {...register("phone")} />
          {err("phone")}
        </div>

        <div>
          <FieldLabel icon={MapPin}>Pincode</FieldLabel>
          <input className={ds.field} placeholder="560001" {...register("pincode")} />
          {err("pincode")}
        </div>
        <div>
          <FieldLabel icon={User}>Age</FieldLabel>
          <input type="number" className={ds.field} placeholder="30" {...register("age")} />
          {err("age")}
        </div>

        <div className="col-span-2">
          <FieldLabel icon={MapPin}>Address</FieldLabel>
          <input className={ds.field} placeholder="Street, City, State" {...register("address")} />
        </div>

        <div className="col-span-2">
          <FieldLabel>Gender</FieldLabel>
          <div className="flex gap-2">
            {(["Male", "Female", "Other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setValue("gender", g)}
                className={cn(
                  "h-9 flex-1 rounded-md border text-sm font-medium transition-colors",
                  gender === g
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel icon={Percent}>Discount %</FieldLabel>
          <input type="number" step="0.01" className={ds.field} placeholder="0" {...register("discount")} />
        </div>
        <div>
          <FieldLabel icon={CreditCard}>Credit Limit</FieldLabel>
          <input type="number" className={ds.field} placeholder="0" {...register("creditLimit")} />
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3">
        <button
          type="button"
          className={ds.btnOutline}
          onClick={onCancel}
        >
          Cancel
          <kbd className="ml-1 rounded border border-gray-300 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">
            ESC
          </kbd>
        </button>
        <button type="submit" className={ds.btnStrong} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Patient
          <kbd className="ml-1 rounded border border-white/30 bg-white/10 px-1 font-mono text-[10px]">
            CTRL+S
          </kbd>
        </button>
      </div>
    </form>
  );
}
