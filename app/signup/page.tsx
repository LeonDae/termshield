"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BrandLogo } from "@/components/BrandLogo";

export default function SignupPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      setSuccessMessage("Signup successful! Please check your email for a verification link.");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-gradient-hero page-transition-fade">
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <BrandLogo iconSize={36} textClassName="text-2xl font-extrabold tracking-wider text-white font-sans" />
          </Link>
          <p className="mt-2 text-sm text-on-surface-variant">Protect Your Next Contract</p>
        </div>

        {/* Signup card */}
        <div ref={containerRef} className="glass-card rounded-3xl p-8 page-transition-enter">
          <h1 className="text-2xl font-bold text-on-surface">Create Account</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Join the frontier of TermShield.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-error/10 border border-error/20 p-3 text-sm text-error animate-slide-up">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm text-primary animate-slide-up">
              {successMessage}
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSignup}>
            <label className="block">
              <span className="text-sm font-medium text-on-surface">Full Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-on-surface-variant">Minimum 8 characters</p>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-outline-variant accent-primary"
              />
              <span className="text-sm text-on-surface-variant">
                I agree to the{" "}
                <a href="#" className="text-primary hover:text-primary-fixed transition">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:text-primary-fixed transition">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold glow-primary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:text-primary-fixed transition">
              Log In
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-on-surface-variant/50">
          © 2026 TermShield. Built for freelancers, by freelancers.
        </p>
      </div>
    </div>
  );
}

