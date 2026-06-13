"use client";

import { ClipboardList } from "lucide-react";
import { MasterCrud } from "@/components/masters/master-crud";

export default function CategoryMasterPage() {
  return (
    <MasterCrud
      endpoint="/masters/categories"
      icon={ClipboardList}
      noun="categories"
      addLabel="Add Category"
      columns={[
        { key: "code", label: "Code", mono: true, className: "w-32" },
        { key: "name", label: "Category Name" },
      ]}
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "name", label: "Category Name", required: true },
      ]}
    />
  );
}
