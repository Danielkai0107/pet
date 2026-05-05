import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Right-side header content (e.g. status badge). */
  headerExtra?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  headerExtra,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5">
            <h2 className="truncate text-base font-semibold text-neutral-900">
              {title}
            </h2>
            <div className="flex items-center gap-2">
              {headerExtra}
              <button
                onClick={onClose}
                className="-mr-1 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                aria-label="關閉"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
