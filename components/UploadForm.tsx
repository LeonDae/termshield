"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

type PlanType = "free" | "basic" | "premium";

const LOADING_STEPS = [
  "Securing server connection...",
  "Uploading contract PDF...",
  "Extracting text content...",
  "Running compliance rules...",
  "Launching semantic retrievers...",
  "Connecting to AI scanning engine...",
  "Preparing analysis vault...",
];

const planCopy: Record<PlanType, { price: string; description: string }> = {
  free: {
    price: "₹0",
    description: "Risk scan across 4 core categories.",
  },
  basic: {
    price: "₹49",
    description: "Risk scan across 8 categories.",
  },
  premium: {
    price: "₹99",
    description: "All 10 categories + fix messages + send.",
  },
};

interface UploadFormProps {
  showFreePlan?: boolean;
}

export function UploadForm({ showFreePlan = false }: UploadFormProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [planType, setPlanType] = useState<PlanType>(showFreePlan ? "free" : "premium");
  const [contractText, setContractText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const isBusy = isSubmitting || isNavigating;

  useEffect(() => {
    if (!isBusy) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);

    return () => clearInterval(interval);
  }, [isBusy]);

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
        formData.append("planType", planType === "free" ? "basic" : planType);

        response = await fetch("/api/scan/upload", {
          method: "POST",
          headers: session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : undefined,
          body: formData,
        });
      } else {
        // Text paste — JSON
        response = await fetch("/api/scan/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            contractText,
            planType: planType === "free" ? "basic" : planType,
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

  if (isBusy) {
    return (
      <section className="glass-card rounded-3xl p-8 relative overflow-hidden animate-fade-in text-center min-h-[380px] flex flex-col items-center justify-center">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="scan-animation-container w-full flex flex-col items-center justify-center py-6">
          {/* Floating particles */}
          <div className="scan-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="scan-particle" />
            ))}
          </div>

          {/* Document silhouette with scan line */}
          <div className="scan-document mb-6">
            <div className="scan-doc-fold" />
            <div className="scan-line" />
            <div className="scan-line-glow" />
            <div className="scan-doc-lines">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="scan-doc-line" />
              ))}
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-3 max-w-sm">
            <h2 className="text-xl font-bold text-on-surface tracking-tight">
              Analyzing Contract...
            </h2>
            
            {/* Dynamic Loading Step */}
            <div className="h-6 flex items-center justify-center">
              <p className="text-sm font-semibold text-primary transition-all duration-300 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {LOADING_STEPS[loadingStep]}
              </p>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed px-4">
              Our hybrid AI pipeline is parsing and segmenting your contract. Please do not close this window.
            </p>
          </div>

          {/* Progress bar simulation */}
          <div className="w-full max-w-xs mt-6 px-4">
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-container via-primary to-primary-fixed rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(95, (loadingStep + 1) * 15)}%` }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label text-primary">Step 1</p>
          <h2 className="mt-2 text-2xl font-semibold text-on-surface">
            Upload your contract
          </h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
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
              ? "rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary transition-all shadow-glow-primary"
              : "rounded-full border border-outline-variant/30 bg-transparent px-5 py-2.5 text-xs font-semibold text-on-surface-variant transition-all hover:border-primary/40 hover:text-primary"
          }
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={
            mode === "text"
              ? "rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary transition-all shadow-glow-primary"
              : "rounded-full border border-outline-variant/30 bg-transparent px-5 py-2.5 text-xs font-semibold text-on-surface-variant transition-all hover:border-primary/40 hover:text-primary"
          }
        >
          Paste Text
        </button>
      </div>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
        {/* PDF upload area */}
        {mode === "pdf" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              isDragOver
                ? "border-primary bg-primary/5 shadow-glow-primary"
                : selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-outline-variant/30 bg-surface-container-lowest/40 hover:border-primary/30 hover:bg-surface-container-lowest/60"
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
                  className="mb-2 h-8 w-8 text-primary"
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
                <p className="text-sm font-semibold text-primary">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs text-primary/70">
                  {(selectedFile.size / 1024).toFixed(0)} KB — Click or drop to replace
                </p>
              </>
            ) : (
              <>
                <svg
                  className="mb-2 h-8 w-8 text-on-surface-variant/50"
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
                <p className="text-sm font-medium text-on-surface">
                  Drop your PDF here or click to browse
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  PDF files only, up to 10 MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Text paste area */}
        {mode === "text" && (
          <label className="grid gap-2 text-sm font-medium text-on-surface">
            Contract text
            <textarea
              value={contractText}
              onChange={(event) => setContractText(event.target.value)}
              placeholder="Paste at least 120 characters from the contract here..."
              rows={10}
              className="glass-input rounded-2xl px-4 py-3 text-sm leading-6"
            />
            <p className="text-xs text-on-surface-variant">
              {contractText.length} / 120 characters minimum
            </p>
          </label>
        )}

        {/* Plan selector */}
        <div className={`grid gap-3 ${showFreePlan ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {(showFreePlan ? (["free", "basic", "premium"] as const) : (["basic", "premium"] as const)).map((plan) => {
            const isSelected = planType === plan;

            return (
              <button
                key={plan}
                type="button"
                onClick={() => setPlanType(plan)}
                className={`rounded-2xl px-4 py-4 text-left transition-all duration-300 ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30 shadow-glow-primary"
                    : "bg-surface-container-lowest/40 border border-outline-variant/15 hover:border-outline-variant/30 hover:bg-surface-container-lowest/60"
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    isSelected ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {plan === "free" ? "Free" : plan === "basic" ? "Basic" : "Premium"} — {planCopy[plan].price}
                </span>
                <span
                  className={`mt-1 block text-sm ${
                    isSelected ? "text-primary/70" : "text-on-surface-variant"
                  }`}
                >
                  {planCopy[plan].description}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-2xl bg-error-container/20 border border-error/20 p-4 text-sm leading-6 text-error">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isBusy}
          className="btn-primary inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isBusy ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing contract...
            </span>
          ) : (
            "Scan Contract →"
          )}
        </button>
      </form>
    </section>
  );
}
