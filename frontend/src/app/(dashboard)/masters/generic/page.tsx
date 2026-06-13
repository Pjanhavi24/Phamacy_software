"use client";

import { Pill } from "lucide-react";
import { MasterCrud } from "@/components/masters/master-crud";

export default function GenericMasterPage() {
  return (
    <MasterCrud
      endpoint="/masters/generics"
      icon={Pill}
      noun="generic groups"
      addLabel="Add Generic Group"
      columns={[
        { key: "code", label: "Code", mono: true, className: "w-20" },
        { key: "name", label: "Name" },
        { key: "schedule", label: "Schedule", className: "w-24" },
        { key: "dosage", label: "Dosage", className: "w-32" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true, full: true },
        { key: "schedule", label: "Schedule", type: "select", options: ["H", "H1", "X", "G", "OTC"] },
        { key: "dosage", label: "Dosage", placeholder: "e.g. Tablet, Syrup (optional)" },
      ]}
    />
  );
}
