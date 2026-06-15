"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const supplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, "Supplier name is required"),
  phone: z.string().optional(),
  mobileNo: z.string().optional(),
  contactPerson: z.string().optional(),
  visitDay: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  ourCode: z.string().optional(),
  panNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
  cdPct: z.coerce.number().min(0).max(100).optional(),
  dlNumber: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

// name kept first so the grid reads naturally; address + DL span full width.
const FIELDS: { name: keyof SupplierFormValues; label: string; required?: boolean; placeholder?: string }[] = [
  { name: "code", label: "Supplier Code", placeholder: "SUP001" },
  { name: "name", label: "Name", required: true, placeholder: "MedLine Pharma Distributors" },
  { name: "phone", label: "Phone No", placeholder: "9876543210" },
  { name: "mobileNo", label: "Mobile No", placeholder: "9876543210" },
  { name: "contactPerson", label: "Contact Person", placeholder: "Person name" },
  { name: "visitDay", label: "Visit Day", placeholder: "e.g. Monday" },
  { name: "email", label: "Email", placeholder: "billing@supplier.com" },
  { name: "ourCode", label: "Our Code", placeholder: "Our party code" },
  { name: "panNumber", label: "PAN Number", placeholder: "ABCDE1234F" },
  { name: "aadharNumber", label: "Aadhar Number", placeholder: "1234 5678 9012" },
  { name: "state", label: "State", placeholder: "Karnataka" },
  { name: "gstin", label: "GSTIN", placeholder: "29ABCDE1234F1Z5" },
  { name: "cdPct", label: "Cash Discount (CD %)", placeholder: "e.g. 5" },
];

interface SupplierFormProps {
  defaultValues?: Partial<SupplierFormValues> & { id?: string };
  onSuccess?: () => void;
}

export function SupplierForm({ defaultValues, onSuccess }: SupplierFormProps) {
  const qc = useQueryClient();
  const id = defaultValues?.id;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", phone: "", ...defaultValues },
  });

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      if (id) await apiClient.put(`/suppliers/${id}`, data);
      else await apiClient.post("/suppliers", data);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(id ? "Supplier updated" : "Supplier added");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not save supplier");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {f.label} {f.required && <span className="text-red-500">*</span>}
            </label>
            <Input placeholder={f.placeholder} {...register(f.name)} />
            {errors[f.name] && (
              <p className="mt-1 text-xs text-red-500">{String(errors[f.name]?.message)}</p>
            )}
          </div>
        ))}
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Drug License Number
          </label>
          <Input placeholder="DL-20B/21B-..." {...register("dlNumber")} />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Address</label>
          <Textarea placeholder="Street, City, PIN" rows={2} {...register("address")} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : id ? "Update Supplier" : "Save Supplier"}
      </Button>
    </form>
  );
}
