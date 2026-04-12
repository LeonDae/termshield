"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user) {
      setWhatsappEnabled(user.user_metadata?.whatsapp_integration === true);
      setEmailEnabled(user.user_metadata?.email_integration === true);
    }
  }, [user, loading, router]);

  const toggleSetting = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    if (key === "whatsapp") setWhatsappEnabled(newValue);
    if (key === "email") setEmailEnabled(newValue);
    
    setSaving(true);
    await supabase.auth.updateUser({
      data: {
        [`${key}_integration`]: newValue,
      }
    });
    setSaving(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-heavy sticky top-0 z-40" style={{ borderBottom: '1px solid rgba(60,74,66,0.2)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-on-surface">
              Term<span className="text-primary">Shield</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary font-medium">{user.user_metadata?.full_name || user.email}</span>
            <Link href="/" className="text-sm text-on-surface-variant hover:text-primary transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Account Settings</h1>
            <p className="mt-2 text-on-surface-variant">
              Manage your account, integrations, and subscription.
            </p>
          </div>
          {saving && <span className="text-xs text-primary animate-pulse flex items-center gap-2">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving changes...
          </span>}
        </div>

        <div className="grid gap-6">
          {/* Profile Section */}
          <div className="glass-card rounded-2xl p-6 group">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-glow-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-on-surface">Profile</h3>
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant leading-6">
                  {user.email} <br />
                  <span className="opacity-70">Member since {new Date(user.created_at).toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Integration */}
          <div className="glass-card rounded-2xl p-6 group hover:border-primary/20 transition-colors">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-glow-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-on-surface">WhatsApp Integration</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={whatsappEnabled} onChange={() => toggleSetting('whatsapp', whatsappEnabled)} />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant leading-6">
                  Connect your WhatsApp to receive risk reports and negotiation drafts directly.
                </p>
              </div>
            </div>
          </div>

          {/* Email Integration */}
          <div className="glass-card rounded-2xl p-6 group hover:border-primary/20 transition-colors">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-glow-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-on-surface">Email Integration</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={emailEnabled} onChange={() => toggleSetting('email', emailEnabled)} />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant leading-6">
                  Connect your Gmail to export reports and send negotiation messages directly.
                </p>
              </div>
            </div>
          </div>
          
          {/* Subscription */}
          <div className="glass-card rounded-2xl p-6 group">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-glow-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-on-surface">Subscription</h3>
                   <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    Coming Soon
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant leading-6">
                  Manage your plan, billing information, and payment history.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Danger zone */}
        <div className="mt-12 glass-card rounded-2xl p-6 border-error/10">
          <h3 className="text-lg font-semibold text-error">Danger Zone</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Permanently logout or delete your account.
          </p>
          <div className="mt-4 flex gap-3">
             <button
              onClick={() => { supabase.auth.signOut(); router.push("/login"); }}
              className="rounded-full flex items-center justify-center w-32 bg-surface-container-highest px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-white/10"
            >
              Sign Out
            </button>
            <button
              className="rounded-full bg-error/10 border border-error/20 px-5 py-2 text-sm font-semibold text-error transition hover:bg-error/20"
              disabled
            >
              Delete Account (Coming Soon)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
