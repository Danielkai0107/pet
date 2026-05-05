import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="mt-3 text-xl font-bold text-slate-900">找不到這個頁面</h1>
      <p className="mt-2 text-sm text-slate-600">
        連結可能已失效或被移除。
      </p>
      <Link to="/" className="btn-primary mt-6">
        回首頁
      </Link>
    </div>
  );
}
