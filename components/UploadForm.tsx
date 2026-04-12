"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useTransition, useCallback } from "react";

type PlanType = "basic" | "premium";

const planCopy: Record<PlanType, { price: string; description: string }> = {
  basic: {
    price: "₹199",
    description: "Risk scan across 4 categories.",
  },
  premium: {
    price: "₹499",
    description: "Risk scan + fix messages + send.",
  },
};

export function UploadForm() {
  const router = useRouter();
  const [planType, setPlanType] = useState<PlanType>("premium");
  const [contractText, setContractText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isBusy = isSubmitting || isNavigating;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError("");
    } else {
      setError("Please drop a PDF file.");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be under 10 MB.");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Validate input
    if (mode === "pdf" && !selectedFile) {
      setError("Please upload a PDF file.");
      return;
    }
    if (mode === "text" && contractText.trim().length < 120) {
      setError("Paste at least 120 characters of contract text.");
      return;
    }

    setIsSubmitting(true);

    try {
      let response: Response;

      if (mode === "pdf" && selectedFile) {
        // PDF upload — multipart form data
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("planType", planType);

        response = await fetch("/api/scan/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        // Text paste — JSON
        response = await fetch("/api/scan/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractText,
            planType,
          }),
        });
      }

      const payload = (await response.json()) as {
        message?: string;
        scan?: { id: string };
      };

      if (!response.ok || !payload.scan?.id) {
        throw new Error(payload.message ?? "Unable to create the scan.");
      }

      startTransition(() => {
        router.push(`/scan/${payload.scan!.id}`);
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the scan."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Step 1
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Upload your contract
          </h2>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Upload a PDF contract or paste the text directly. We&apos;ll scan it for
        risky clauses across 4 categories in under 60 seconds.
      </p>

      {/* Mode toggle */}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("pdf")}
          className={
            mode === "pdf"
              ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition"
              : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
          }
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={
            mode === "text"
              ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition"
              : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
          }
        >
          Paste Text
        </button>
      </div>

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        {/* PDF upload area */}
        {mode === "pdf" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragOver
                ? "border-slate-950 bg-slate-50"
                : selectedFile
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <>
                <svg
                  className="mb-2 h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-semibold text-emerald-800">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  {(selectedFile.size / 1024).toFixed(0)} KB — Click or drop to replace
                </p>
              </>
            ) : (
              <>
                <svg
                  className="mb-2 h-8 w-8 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-700">
                  Drop your PDF here or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF files only, up to 10 MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Text paste area */}
        {mode === "text" && (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Contract text
            <textarea
              value={contractText}
              onChange={(event) => setContractText(event.target.value)}
              placeholder="Paste at least 120 characters from the contract here..."
              rows={10}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950"
            />
            <p className="text-xs text-slate-500">
              {contractText.length} / 120 characters minimum
            </p>
          </label>
        )}

        {/* Plan selector */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(["basic", "premium"] as const).map((plan) => {
            const isSelected = planType === plan;

            return (
              <button
                key={plan}
                type="button"
                onClick={() => setPlanType(plan)}
                className={
                  isSelected
                    ? "rounded-2xl border border-slate-900 bg-slate-950 px-4 py-4 text-left text-white transition hover:bg-slate-800"
                    : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
                }
              >
                <span
                  className={
                    isSelected
                      ? "block text-sm font-semibold"
                      : "block text-sm font-semibold text-slate-950"
                  }
                >
                  {plan === "basic" ? "Basic" : "Premium"} — {planCopy[plan].price}
                </span>
                <span
                  className={
                    isSelected
                      ? "mt-1 block text-sm text-slate-200"
                      : "mt-1 block text-sm text-slate-600"
                  }
                >
                  {planCopy[plan].description}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isBusy ? "Analyzing contract..." : "Scan contract"}
        </button>
      </form>
    </section>
  );
}
