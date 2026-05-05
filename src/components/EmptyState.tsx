import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Airbnb 風空狀態：outline icon、不帶圓底色塊；
 * 黑色標題 + neutral-500 副標 + 居中 CTA。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <Icon
          className="mb-4 h-10 w-10 text-neutral-400"
          strokeWidth={1.5}
        />
      )}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
