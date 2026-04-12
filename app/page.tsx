import { DemoPreview } from "@/components/DemoPreview";
import { UploadForm } from "@/components/UploadForm";
import { demoScan } from "@/lib/demo-scan";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-slate-300 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              TermShield
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                One Next.js app, with both the frontend and backend in one place.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                This is the simplest starting architecture for your SaaS. The UI
                lives in pages and components, the backend lives in API routes,
                and Supabase handles the database outside your codebase.
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Frontend
              </p>
              <p className="text-sm leading-6 text-slate-700">
                `app/` and `components/` render pages, forms, and results.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Backend
              </p>
              <p className="text-sm leading-6 text-slate-700">
                `app/api/` handles uploads, payments, polling, and webhooks.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Shared Logic
              </p>
              <p className="text-sm leading-6 text-slate-700">
                `lib/` and `types/` hold code used by both sides of the app.
              </p>
            </div>
          </div>

          <UploadForm />
        </div>

        <DemoPreview scan={demoScan} />
      </section>
    </main>
  );
}
