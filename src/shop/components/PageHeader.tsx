import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Airbnb 風 PageHeader（精簡版）：
 *   - 標題使用 text-base/font-semibold，比一般 h1 細，主要為內容騰出空間
 *   - 副標 12px 灰字，行高貼齊標題，避免高度過大
 *   - 純白底、無背景色，與全站「不要大色塊」一致
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}
