import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ElementType } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "indigo";
  loading?: boolean;
}

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/40",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    iconColor: "text-green-600 dark:text-green-400",
    border: "border-green-100 dark:border-green-900/50",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-100 dark:border-yellow-900/50",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/40",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    border: "border-red-100 dark:border-red-900/50",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/50",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-100 dark:border-indigo-900/50",
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  prefix = "",
  suffix = "",
  color = "blue",
  loading = false,
}: StatCardProps) {
  const colors = COLOR_MAP[color];

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="mt-4 h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="mt-2 h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  const TrendIcon =
    change === undefined || change === 0
      ? Minus
      : change > 0
      ? TrendingUp
      : TrendingDown;

  const trendColor =
    change === undefined || change === 0
      ? "text-gray-400"
      : change > 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  const trendBg =
    change === undefined || change === 0
      ? "bg-gray-100 dark:bg-gray-800"
      : change > 0
      ? "bg-green-50 dark:bg-green-950/40"
      : "bg-red-50 dark:bg-red-950/40";

  return (
    <div
      className={`
        rounded-xl border p-5 transition-shadow hover:shadow-md
        bg-white dark:bg-gray-900
        border-gray-200 dark:border-gray-800
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
          </p>
          {change !== undefined && (
            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${trendBg} ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{Math.abs(change)}%</span>
              {changeLabel && <span className="font-normal text-gray-400">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${colors.iconBg}`}>
          <Icon className={`w-6 h-6 ${colors.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
