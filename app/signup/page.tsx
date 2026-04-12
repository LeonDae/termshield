"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-gradient-hero">
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-on-surface">
              Term<span className="text-primary">Shield</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-on-surface-variant">Protect Your Next Contract</p>
        </div>

        {/* Signup card */}
        <div className="glass-card rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-on-surface">Create Account</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Join the frontier of Luminescent Ledger technology.
          </p>

          <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <label className="block">
              <span className="text-sm font-medium text-on-surface">Full Name</span>
              <input
                type="text"
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
              className="btn-primary w-full rounded-full py-3 text-sm font-semibold glow-primary"
            >
              Create Account
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
          © 2025 TermShield. Protected by Luminescent Ledger technology.
        </p>
      </div>
    </div>
  );
}
