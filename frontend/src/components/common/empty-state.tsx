import type { ElementType, ReactNode } from "react";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: ElementType;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = "No data found",
  description = "There are no records to display here yet.",
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-900/50
        ${compact ? "py-10 px-6" : "py-20 px-8"}
      `}
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
