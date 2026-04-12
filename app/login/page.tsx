"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

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
          <p className="mt-2 text-sm text-on-surface-variant">Securing the Luminescent Ledger.</p>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-on-surface">Welcome Back</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Enter your credentials to access your secure vault.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-error/10 border border-error/20 p-3 text-sm text-error animate-slide-up">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleLogin}>
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
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-on-surface-variant cursor-pointer">
                <input type="checkbox" className="rounded border-outline-variant accent-primary" />
                Remember me
              </label>
              <a href="#" className="text-primary hover:text-primary-fixed transition text-sm">
                Forgot Password?
              </a>
            </div>

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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:text-primary-fixed transition">
              Sign Up
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
