"use client";

import { Store } from "lucide-react";
import { MasterCrud } from "@/components/masters/master-crud";

export default function CompanyMasterPage() {
  return (
    <MasterCrud
      endpoint="/masters/companies"
      icon={Store}
      noun="companies"
      addLabel="Add Company"
      columns={[
        { key: "code", label: "Company Code", mono: true, className: "w-32" },
        { key: "name", label: "Name" },
      ]}
      fields={[
        { key: "code", label: "Company Code", required: true },
        { key: "name", label: "Name", required: true },
      ]}
    />
  );
}
