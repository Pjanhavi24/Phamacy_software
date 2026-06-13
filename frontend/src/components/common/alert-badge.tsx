import { AlertTriangle, Clock, X } from "lucide-react";

export type AlertType = "low-stock" | "expiry" | "out-of-stock";

interface AlertBadgeProps {
  type: AlertType;
  count?: number;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  size?: "sm" | "md";
}

const ALERT_CONFIG: Record<
  AlertType,
  { label: string; bg: string; text: string; border: string; icon: typeof AlertTriangle }
> = {
  "low-stock": {
    label: "Low Stock",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-300 dark:border-yellow-700",
    icon: AlertTriangle,
  },
  "expiry": {
    label: "Expiring Soon",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-700",
    icon: Clock,
  },
  "out-of-stock": {
    label: "Out of Stock",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-300 dark:border-gray-600",
    icon: AlertTriangle,
  },
};

export default function AlertBadge({
  type,
  count,
  message,
  dismissible = false,
  onDismiss,
  size = "md",
}: AlertBadgeProps) {
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  if (size === "sm") {
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border
          ${config.bg} ${config.text} ${config.border}
        `}
      >
        <Icon className="w-3 h-3" />
        {count !== undefined ? `${count} ${config.label}` : config.label}
      </span>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border
        ${config.bg} ${config.text} ${config.border}
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{config.label}</span>
        {count !== undefined && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-current/20 text-xs font-bold">
            {count}
          </span>
        )}
        {message && (
          <p className="text-sm mt-0.5 opacity-80 truncate">{message}</p>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-current/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
