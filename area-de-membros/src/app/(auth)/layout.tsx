import { SITE_NAME } from "@/lib/utils";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10 bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600">
      <div className="w-full max-w-md">
        <p className="text-center text-white text-2xl font-bold mb-6">{SITE_NAME}</p>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
