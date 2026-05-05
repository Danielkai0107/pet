interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "載入中…" }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-brand-300 opacity-60" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}
