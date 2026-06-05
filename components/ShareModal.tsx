"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Scan } from "@/types";

interface ShareModalProps {
  scan: Scan;
  onClose: () => void;
}

export function ShareModal({ scan, onClose }: ShareModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const subject = `Proposed Changes - ${scan.filename}`;

  useEffect(() => {
    // Construct default message structure
    const concerns = scan.risks
      .filter((r) => r.severity === "critical" || r.severity === "important")
      .map((r, index) => {
        const categoryLabel =
          r.category === "ip"
            ? "Intellectual Property"
            : r.category === "payment"
            ? "Payment Terms"
            : r.category === "non-compete"
            ? "Non-Compete"
            : r.category === "termination"
            ? "Termination"
            : r.category;
        
        return `${index + 1}. [${categoryLabel}]
   • What was proposed: "${r.clauseText.trim()}"
   • Suggested revision: ${r.fixMessage || r.explanation}`;
      })
      .join("\n\n");

    const defaultMessage = `Dear Sir/Madam,

Thank you for sharing the contract for "${scan.filename}". I have reviewed the terms, and everything looks great overall.

To ensure mutual protection and clear alignment before we begin, I would like to propose a few standard adjustments to the following clauses:

${concerns || "1. General terms adjustment: Please see the attached report for suggested modifications."}

These adjustments are aligned with standard freelance practices in India and ensure we are both fully protected. Please let me know if these changes work for you, and I will be happy to sign the updated version.

Looking forward to working together!

Best regards,`;

    setMessageText(defaultMessage);
  }, [scan]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Deep Link URLs
  const encodedText = encodeURIComponent(messageText);
  const encodedSubject = encodeURIComponent(subject);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedText}`;
  const mailtoUrl = `mailto:?subject=${encodedSubject}&body=${encodedText}`;
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodedSubject}&body=${encodedText}`;

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user && user.user_metadata?.whatsapp_integration !== true) {
      e.preventDefault();
      setWarning("WhatsApp integration is disabled in your settings.");
    }
  };

  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user && user.user_metadata?.email_integration !== true) {
      e.preventDefault();
      setWarning("Email integration is disabled in your settings.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-print">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-6 sm:p-8 border-outline-variant/20 shadow-2xl relative animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition p-2"
          aria-label="Close modal"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-2">
          <span>📧</span> Send Counter Offer
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Review and customize the message below. Once ready, choose your preferred application to send it.
        </p>

        {/* Editable Message Area */}
        <div className="flex flex-col gap-2 mb-6">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full h-64 glass-input rounded-2xl p-4 text-sm leading-relaxed font-sans resize-none"
            placeholder="Type your message here..."
          />
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary transition-all flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <span>✓</span> Copied
                </>
              ) : (
                <>
                  <span>📋</span> Copy Text
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="mb-6 p-4 rounded-2xl bg-error/10 border border-error/20 text-error flex items-start gap-3 animate-fade-in">
            <span className="text-lg mt-0.5">⚠️</span>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-error">Integration Disabled</p>
              <p className="mt-1 text-on-surface-variant/90">
                {warning} Please go to your <a href="/settings" className="text-primary hover:underline font-semibold">Account Settings</a> to enable it.
              </p>
            </div>
            <button 
              onClick={() => setWarning(null)} 
              className="text-on-surface-variant hover:text-on-surface transition font-semibold text-xs px-2 py-1 bg-surface-container-highest/40 hover:bg-surface-container-highest/85 rounded-lg"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Share Destination Buttons */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            onClick={handleWhatsAppClick}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 py-3.5 text-sm font-semibold text-emerald-300 transition-all hover:scale-[1.02]"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 508l143-37.5c32.7 17.8 69.4 27.2 107.1 27.2h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-84.7 22.2 22.6-82.4-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
            WhatsApp
          </a>

          {/* Email / Gmail */}
          <a
            href={gmailUrl}
            onClick={handleEmailClick}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 py-3.5 text-sm font-semibold text-red-300 transition-all hover:scale-[1.02]"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M24 5.457v13.086c0 1.354-1.102 2.457-2.457 2.457H2.457C1.102 21 0 19.897 0 18.543V5.457C0 4.103 1.102 3 2.457 3h19.086C22.898 3 24 4.103 24 5.457zm-2.457.543h-19.086l9.543 6.943L21.543 6z" />
            </svg>
            Gmail
          </a>

          {/* Outlook */}
          <a
            href={outlookUrl}
            onClick={handleEmailClick}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 py-3.5 text-sm font-semibold text-blue-300 transition-all hover:scale-[1.02]"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M11.385 4.5v15l8.615 2.25V2.25L11.385 4.5zM2 7v10l6.5 1.5V5.5L2 7z" />
            </svg>
            Outlook
          </a>
        </div>
      </div>
    </div>
  );
}
