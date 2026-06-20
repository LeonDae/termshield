"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UploadForm } from "@/components/UploadForm";
import { supabase } from "@/lib/supabaseClient";
import { BrandLogo } from "@/components/BrandLogo";

/* ═══════════════════════════════════════════════════════════════
   SCROLL ANIMATION HOOK
   Uses IntersectionObserver to add 'visible' class on scroll
   ═══════════════════════════════════════════════════════════════ */
function useScrollAnimations() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(
      ".animate-on-scroll, .animate-on-scroll-scale, .animate-on-scroll-left, .animate-on-scroll-right"
    );
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

const DASHBOARD_SECTIONS = ["features", "whats-new", "workspace", "scan", "roadmap", "pricing", "testimonials"];

/* ═══════════════════════════════════════════════════════════════
   NAV — Floating glassmorphic navbar (without History link)
   ═══════════════════════════════════════════════════════════════ */
function DashboardNav() {
  const navRef = useRef<HTMLElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState("features");
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0, opacity: 0 });


  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        if (window.scrollY > 50) {
          navRef.current.classList.add("glass-heavy");
          navRef.current.style.borderBottom = "1px solid var(--outline-variant)";
        } else {
          navRef.current.classList.remove("glass-heavy");
          navRef.current.style.borderBottom = "1px solid transparent";
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.25, rootMargin: "-25% 0px -45% 0px" }
    );

    DASHBOARD_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const measureTabs = useCallback(() => {
    const activeIndex = DASHBOARD_SECTIONS.indexOf(activeSection);
    const activeLink = linkRefs.current[activeIndex];
    const container = tabContainerRef.current;
    if (activeLink && container) {
      const containerRect = container.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setBubbleStyle({
        left: linkRect.left - containerRect.left,
        width: linkRect.width,
        opacity: 1,
      });
    } else {
      setBubbleStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection]);

  useEffect(() => {
    measureTabs();
    window.addEventListener("resize", measureTabs);
    const timer = setTimeout(measureTabs, 100);
    return () => {
      window.removeEventListener("resize", measureTabs);
      clearTimeout(timer);
    };
  }, [measureTabs]);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{ borderBottom: "1px solid transparent" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/dashboard" className="group">
          <BrandLogo iconSize={32} textClassName="text-lg font-extrabold tracking-wider text-white font-sans" />
        </Link>

        {/* Tab container with liquid glass bubble */}
        <div className="hidden items-center md:flex gap-4">
          <div
            ref={tabContainerRef}
            className="relative px-1 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl flex items-center"
          >
            {/* Liquid glass sliding bubble */}
            <div
              className="nav-liquid-bubble"
              style={{
                left: bubbleStyle.left,
                width: bubbleStyle.width,
                opacity: bubbleStyle.opacity,
              }}
            />

            {/* Links layer */}
            {DASHBOARD_SECTIONS.map((section, i) => {
              const labels: Record<string, string> = {
                features: "Features",
                "whats-new": "What's New",
                workspace: "Workspace",
                scan: "Scan",
                roadmap: "Roadmap",
                pricing: "Pricing",
                testimonials: "Testimonials",
              };
              return (
                <a
                  key={section}
                  ref={(el) => { linkRefs.current[i] = el; }}
                  href={`#${section}`}
                  className={`relative z-10 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${activeSection === section
                      ? "text-white"
                      : "text-on-surface-variant hover:text-on-surface"
                    }`}
                >
                  {labels[section]}
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">


          {user && (
            <Link href="/settings" className="flex items-center gap-2 group p-1.5 rounded-full hover:bg-surface-container-high transition">
              <span className="text-sm font-medium text-on-surface truncate max-w-[120px] hidden sm:block">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO — Animated headline with mesh gradient glow
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  const { user } = useAuth();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-gradient-hero pt-20">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left column */}
          <div className="space-y-8">
            {user && (
              <div style={{ animation: "fadeInUp 0.8s cubic-bezier(0.4,0,0.2,1) forwards" }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface">
                  Welcome, <span className="gradient-text">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>!
                </h2>
              </div>
            )}

            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                AI-Powered Contract Protection
              </span>
            </div>

            <h1
              className="text-display text-4xl font-extrabold sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.15s", animation: "fadeInUp 0.8s cubic-bezier(0.4,0,0.2,1) forwards" }}
            >
              Stop signing contracts that{" "}
              <span className="gradient-text">cost you lakhs.</span>
            </h1>

            <p
              className="max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg"
              style={{ opacity: 0, animationDelay: "0.3s", animation: "fadeInUp 0.8s 0.3s cubic-bezier(0.4,0,0.2,1) forwards" }}
            >
              TermShield scans your client contracts for the 4 patterns that silently cost Indian freelancers ₹5L+ per bad engagement. Plain-English risk detection in under 60 seconds.
            </p>

            <div
              className="flex flex-wrap gap-4"
              style={{ opacity: 0, animationDelay: "0.45s", animation: "fadeInUp 0.8s 0.45s cubic-bezier(0.4,0,0.2,1) forwards" }}
            >
              <a
                href="#scan"
                className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold glow-primary-strong"
              >
                Scan Your Contract →
              </a>
              <a
                href="#workspace"
                className="btn-secondary rounded-full px-8 py-3.5 text-sm"
              >
                Go to Workspace
              </a>
            </div>

            <div
              className="flex items-center gap-6 text-sm text-on-surface-variant"
              style={{ opacity: 0, animationDelay: "0.6s", animation: "fadeInUp 0.8s 0.6s cubic-bezier(0.4,0,0.2,1) forwards" }}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                12,000+ contracts scanned
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ₹2.4Cr+ saved
              </span>
            </div>
          </div>

          {/* Right column — Floating preview card */}
          <div
            className="relative animate-float hidden lg:block"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-3 w-3 rounded-full bg-error/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-primary/70" />
                <span className="ml-auto text-label text-on-surface-variant">RISK ANALYSIS</span>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-container-lowest/60 p-4 accent-critical">
                  <p className="text-label text-error mb-1">CRITICAL RISK</p>
                  <p className="text-sm font-semibold text-on-surface">Payment Terms</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Payment terms state &quot;Net-90&quot;, but common industry standard is Net-30 for your scale.
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-container-lowest/60 p-4 accent-safe">
                  <p className="text-label text-primary mb-1">SAFE</p>
                  <p className="text-sm font-semibold text-on-surface">Termination Clause</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Termination requires 30-day notice with pro-rated payment. This protects your cashflow.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-surface-container-lowest/60 p-4">
                  <div>
                    <p className="text-xs text-on-surface-variant">Overall Confidence</p>
                    <p className="text-2xl font-bold text-primary">87%</p>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin-glow" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ambient glow behind the card */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/5 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "🔍",
    title: "AI-Powered Scan",
    description:
      "Upload any PDF or text contract. Our RAG-enhanced pipeline scans and extracts risky terms across 10 distinct legal compliance categories.",
  },
  {
    icon: "💰",
    title: "Financial Impact",
    description:
      "Get clear estimates of the hidden financial risks of each clause, helping you prioritize what to negotiate before you sign.",
  },
  {
    icon: "💡",
    title: "1-Click Negotiation",
    description:
      "Receive plain-English rewrites and direct counter-proposals to send back to clients, avoiding awkward legal back-and-forth.",
  },
  {
    icon: "📲",
    title: "WhatsApp Export",
    description:
      "Export suggested rewrites directly to WhatsApp in 1-click. Share clean, professional bullet points to negotiate on the go.",
  },
  {
    icon: "🧮",
    title: "Smart Invoice Studio",
    description:
      "A premium CRM-style billing studio. Build, customize, and calculate professional invoices with itemized tax/discounts and export to PDF instantly.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   FEATURES SECTION (Picture 1 - Changed to show user relevance tabs)
   ═══════════════════════════════════════════════════════════════ */
function FeaturesSection({ plan, scansCount }: { plan: string; scansCount: number }) {
  const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1);
  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center animate-on-scroll">
            <span className="text-label text-primary">Features</span>
            <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              Everything you need to <span className="gradient-text-primary">protect your work.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
              Most freelancers lose money not because they lack skill, but because they sign terms they can&apos;t fulfill. We solve that in seconds.
            </p>
          </div>

          {/* 5 Core Feature Cards with Flip Animation */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`flip-card-container animate-on-scroll-scale stagger-${i + 1}`}
                style={{ height: "250px" }}
              >
                <div className="flip-card-inner">
                  {/* FRONT FACE */}
                  <div className="flip-card-front glass-card p-6 flex flex-col justify-between cursor-default border border-white/10 bg-[#1c1f2d]/85 backdrop-blur-xl relative overflow-hidden">
                    <div className="diagonal-glow-overlay" />
                    <div className="relative z-10">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="text-2xl">{feature.icon}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-on-surface">{feature.title}</h3>
                    </div>
                    <div className="relative z-10 text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                      <span>Hover for details</span>
                      <span>✨</span>
                    </div>
                  </div>
                  {/* BACK FACE */}
                  <div className="flip-card-back glass-card p-6 flex flex-col justify-between cursor-default border border-white/10 relative overflow-hidden">
                    <div className="diagonal-glow-overlay" />
                    <div className="relative z-10">
                      <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">{feature.title}</h3>
                      <p className="text-xs leading-relaxed text-on-surface-variant">{feature.description}</p>
                    </div>
                    <div className="relative z-10 text-[9px] text-on-surface-variant/40 italic">
                      TermShield Protection
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Membership & Rights Subheading */}
          <div className="mt-24 text-center animate-on-scroll">
            <span className="text-label text-primary">Membership & Rights</span>
            <h3 className="mt-2 text-2xl font-bold text-on-surface">
              Your active <span className="gradient-text-primary">legal portal & status.</span>
            </h3>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            {/* Card 1: IPS Rights Resource */}
            <div className="flip-card-container" style={{ height: "230px" }}>
              <div className="flip-card-inner">
                {/* FRONT FACE */}
                <div className="flip-card-front glass-card p-6 flex flex-col justify-between cursor-pointer border border-white/10 bg-[#1c1f2d]/85 backdrop-blur-xl relative overflow-hidden">
                  <div className="diagonal-glow-overlay" />
                  <div className="relative z-10">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-on-surface">Learn about your IPS rights, contracts etc</h3>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Resource Tab
                    </span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse">
                      Hover to open ✨
                    </span>
                  </div>
                </div>
                {/* BACK FACE */}
                <div className="flip-card-back glass-card p-6 flex flex-col justify-between cursor-default border border-white/10 relative overflow-hidden">
                  <div className="diagonal-glow-overlay" />
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">IP, Non-Compete & Liability Rights</h3>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Understand IP transfer policies, non-compete limits, and liability standards under Indian law. (This tab will become active in future updates).
                    </p>
                  </div>
                  <div className="relative z-10 text-[9px] text-on-surface-variant/40 italic">
                    Legal Protection Database
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Current Plan Details */}
            <div className="flip-card-container" style={{ height: "230px" }}>
              <div className="flip-card-inner">
                {/* FRONT FACE */}
                <div className="flip-card-front glass-card p-6 flex flex-col justify-between border border-white/10 bg-[#1c1f2d]/85 backdrop-blur-xl relative overflow-hidden">
                  <div className="diagonal-glow-overlay" />
                  <div className="relative z-10">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface">Learn about current plan</h3>
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <a href="#pricing" className="text-xs font-semibold text-primary hover:underline transition relative z-20">
                      Change Plan →
                    </a>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse">
                      Hover to view stats ✨
                    </span>
                  </div>
                </div>
                {/* BACK FACE */}
                <div className="flip-card-back glass-card p-6 flex flex-col justify-between cursor-default border border-white/10 relative overflow-hidden">
                  <div className="diagonal-glow-overlay" />
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">Current Subscription Status</h3>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      You are currently on the <span className="font-bold text-primary">{formattedPlan} Plan</span>. Completed {scansCount} scans. Scroll down to see upgrade options.
                    </p>
                  </div>
                  <div className="relative z-10 text-[9px] text-on-surface-variant/40 italic">
                    Subscription Tier Details
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHAT'S NEW — Feature highlight of Invoice Builder
   ═══════════════════════════════════════════════════════════════ */
function WhatsNewSection() {
  return (
    <section id="whats-new" className="relative py-24 lg:py-32 section-recessed overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {/* Left Column */}
          <div className="space-y-6 animate-on-scroll">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              What&apos;s New
            </span>
            
            <h2 className="text-display text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              Meet the <span className="gradient-text-primary">Smart Invoice Builder</span>
            </h2>
            
            <p className="text-base text-on-surface-variant leading-relaxed">
              A premium, CRM-integrated billing studio built specifically for independent professionals. Track projects, link clients, save reusable service templates, and build itemized invoices with real-time tax breakdown (CGST/SGST/VAT) and profit-margin calculators.
            </p>

            <ul className="space-y-3.5 text-sm text-[#c4cbdf]">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">✓</span>
                Tabbed Multi-Invoice Management
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">✓</span>
                CRM-Integrated Client & Project Databases
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">✓</span>
                Real-Time Profit Margin & COGS Analytics
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">✓</span>
                Professional PDF Export & JSON Backup
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/invoice"
                className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold glow-primary-strong inline-flex items-center gap-2"
              >
                Try Invoice Builder Now
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Mock of the Invoice Dashboard */}
          <Link 
            href="/invoice"
            className="relative group block animate-on-scroll-scale"
          >
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
            
            <div className="relative rounded-[2rem] border border-[#2a324b]/30 bg-[#1c1f2d]/90 backdrop-blur-2xl p-5 shadow-2xl overflow-hidden glass-card flex gap-4 h-[440px] md:h-[500px]">
              
              {/* Dashboard Left Sidebar */}
              <div className="w-12 h-full flex flex-col items-center py-2 bg-[#101320]/60 rounded-2xl border border-white/[0.03] space-y-4">
                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-[#c4cbdf] hover:text-white transition">
                  {/* Grid Menu Icon */}
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/></svg>
                </div>
                <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">+</div>
                <div className="text-[#c4cbdf]/50 hover:text-[#c4cbdf] transition">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
                </div>
                <div className="h-px w-6 bg-white/[0.05]" />
                <div className="text-[#c4cbdf]/70 hover:text-white transition">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-9 0h.5A.5.5 0 0 1 3 8v2a2 2 0 0 0 2 2h3a.5.5 0 0 1 0 1H5a3 3 0 0 1-3-3V8a.5.5 0 0 1 0-1m10-7h-.5a.5.5 0 0 1-.5-.5V.5A.5.5 0 0 1 12 0h1a3 3 0 0 1 3 3v2.5a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2"/></svg>
                </div>
                <div className="text-[#c4cbdf]/50">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/><path d="M6 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/></svg>
                </div>
                <div className="text-[#c4cbdf]/50">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1"/></svg>
                </div>
              </div>

              {/* Mock Dashboard Main Workspace */}
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">Invoices</h4>
                    <p className="text-[10px] text-[#c4cbdf]">123 invoices</p>
                  </div>
                  <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live Demo
                  </span>
                </div>

                {/* Mock Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  
                  {/* Draft */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-white/[0.02] flex flex-col justify-between">
                    <span className="text-[8px] text-[#c4cbdf] font-bold">Draft</span>
                    <span className="text-xs font-bold text-white mt-1">$12,253.54</span>
                    <span className="text-[8px] text-[#c4cbdf]/60 mt-0.5">3 Invoices</span>
                  </div>

                  {/* Unpaid */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-[#d0bcff]/10 flex flex-col justify-between">
                    <span className="text-[8px] text-[#d0bcff] font-bold">Unpaid</span>
                    <span className="text-xs font-bold text-[#d0bcff] mt-1">$50,650.56</span>
                    <span className="text-[8px] text-[#c4cbdf]/60 mt-0.5">22 Invoices</span>
                  </div>

                  {/* Overdue */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/[0.02] animate-pulse" />
                    <span className="text-[8px] text-red-400 font-bold relative z-10">Overdue</span>
                    <span className="text-xs font-bold text-red-400 mt-1 relative z-10">$36,238.78</span>
                    <span className="text-[8px] text-[#c4cbdf]/60 mt-0.5 relative z-10">6 Invoices</span>
                  </div>

                  {/* Paid */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-primary/20 flex flex-col justify-between">
                    <span className="text-[8px] text-primary font-bold">Paid</span>
                    <span className="text-xs font-bold text-primary mt-1">$67,677.90</span>
                    <span className="text-[8px] text-[#c4cbdf]/60 mt-0.5">78 Invoices</span>
                  </div>

                </div>

                {/* Mock Category Filters */}
                <div className="flex flex-wrap gap-1.5 py-1">
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">All (127)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#c4cbdf]">Paid (67)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#c4cbdf]">Overdue (24)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#c4cbdf]">Unpaid (32)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#c4cbdf]">Draft (23)</span>
                </div>

                {/* Mock Grid List of Invoices */}
                <div className="flex-1 overflow-y-auto pr-0.5 space-y-2 max-h-[200px] md:max-h-[250px] scrollbar-thin">
                  
                  {/* Grid layout for mock invoices */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    
                    {/* Invoice Card 1 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-white/5 text-[#c4cbdf]">Final Version</span>
                        <span className="text-[7px] text-[#c4cbdf]/60">#0002</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$75,250</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#c4cbdf] font-semibold truncate max-w-[80px]">Ella Grace Johnson</span>
                        <span className="text-[7px] text-[#c4cbdf]/50">07/15/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 2 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-white/5 text-[#c4cbdf]">Revised Proposal</span>
                        <span className="text-[7px] text-[#c4cbdf]/60">#0003</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$120,500</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#c4cbdf] font-semibold truncate max-w-[80px]">Noah William Smith</span>
                        <span className="text-[7px] text-[#c4cbdf]/50">08/22/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 3 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Cost Estimation</span>
                        <span className="text-[7px] text-[#c4cbdf]/60">#0004</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$50,300</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#c4cbdf] font-semibold truncate max-w-[80px]">Ava Sophia Lee</span>
                        <span className="text-[7px] text-[#c4cbdf]/50">09/10/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 4 */}
                    <div className="p-3 bg-[#101320]/50 border border-primary/20 bg-primary/[0.02] rounded-xl flex flex-col justify-between hover:border-primary/40 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">✓ Service Charge</span>
                        <span className="text-[7px] text-[#c4cbdf]/60">#0007</span>
                      </div>
                      <p className="text-sm font-extrabold text-primary mt-1.5">$110,200</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#c4cbdf] font-semibold truncate max-w-[80px]">Elijah James Davis</span>
                        <span className="text-[7px] text-[#c4cbdf]/50">12/01/2024</span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Ambient visual overlays */}
              <div className="absolute bottom-[-10%] right-[-10%] w-[120px] h-[120px] bg-primary/10 blur-xl pointer-events-none rounded-full group-hover:bg-primary/25 transition-all duration-700" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WORKSPACE SECTION (Picture 2 - Replaces "How It Works")
   ═══════════════════════════════════════════════════════════════ */
function WorkspaceSection({ scansCount }: { scansCount: number }) {
  return (
    <section id="workspace" className="relative py-24 section-recessed overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll">
          <span className="text-label text-primary">Workspace</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Quick Actions & <span className="gradient-text-primary">Tools</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
            Jump directly into scanning a new contract, building invoices, or checking your transaction audit list.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {/* Card 1: Scan Now */}
          <a
            href="#scan"
            className="animate-on-scroll-scale stagger-1 glass-card rounded-2xl p-6 group cursor-pointer hover:border-primary/30 transition-all duration-300"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-glow-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">Scan Now</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Upload a PDF contract or paste contract text directly. AI scans for critical IP, liability, exclusivity, and termination risks.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
              Open Scanner →
            </span>
          </a>

          {/* Card 2: Invoice Builder */}
          <Link
            href="/invoice"
            className="animate-on-scroll-scale stagger-2 glass-card rounded-2xl p-6 group cursor-pointer hover:border-primary/30 transition-all duration-300"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-glow-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">Invoice Builder</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Launch billing studio. Prepare GST/tax invoices, calculate gross margins dynamically, and download client-ready PDFs.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
              Launch Billing Studio →
            </span>
          </Link>

          {/* Card 3: View Past Scans (bringing the history button here) */}
          <Link
            href="/history"
            className="animate-on-scroll-scale stagger-3 glass-card rounded-2xl p-6 group cursor-pointer hover:border-primary/30 transition-all duration-300"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-glow-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">View Past Scans</h3>
              <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                {scansCount} Scans
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Review completed evaluations. Copy pre-drafted negotiation messages, share reports, and trace contract risk revisions.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
              Review History →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD SCAN SECTION (Picture 3)
   ═══════════════════════════════════════════════════════════════ */
function DashboardScanSection({ scansCount }: { scansCount: number }) {
  return (
    <section id="scan" className="relative py-24 overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center animate-on-scroll mb-12">
            {scansCount > 0 ? (
              <span className="text-label text-primary">Scan Again</span>
            ) : (
              <span className="text-label text-primary">Your First Scan</span>
            )}
            <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl">
              Scan your contract in{" "}
              <span className="gradient-text-primary">seconds.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
              Upload a PDF or paste contract text. We&apos;ll scan it for risky clauses across up to 10 categories in under 60 seconds.
            </p>
          </div>
          <div className="animate-on-scroll-scale stagger-2">
            <UploadForm showFreePlan={true} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROADMAP SECTION — Upcoming Features with 3D marble cards
   ═══════════════════════════════════════════════════════════════ */
const upcomingFeatures = [
  { id: "01", title: "Freelance rate calculator", tag: "Freelancer", icon: "🧮", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
  { id: "02", title: "AI proposal & SOW builder", tag: "Freelancer", icon: "📝", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
  { id: "03", title: "Contract vault", tag: "Both sides", icon: "🗄️", roleColor: "text-primary", roleBg: "bg-primary/10" },
  { id: "04", title: "Client portal", tag: "Client", icon: "🤝", roleColor: "text-blue-300", roleBg: "bg-blue-500/10" },
  { id: "05", title: "Project milestone tracker", tag: "Both sides", icon: "🏁", roleColor: "text-primary", roleBg: "bg-primary/10" },
  { id: "06", title: "Freelance tax estimator (India)", tag: "Freelancer", icon: "📊", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
  { id: "07", title: "Verified freelancer profile", tag: "Both sides", icon: "✅", roleColor: "text-primary", roleBg: "bg-primary/10" },
  { id: "08", title: "Dispute documentation kit", tag: "Freelancer", icon: "⚖️", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
  { id: "09", title: "Freelance income analytics", tag: "Freelancer", icon: "📈", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
  { id: "10", title: "Contract template library", tag: "Both sides", icon: "📚", roleColor: "text-primary", roleBg: "bg-primary/10" },
  { id: "11", title: "Milestone escrow (light)", tag: "Both sides", icon: "🔒", roleColor: "text-primary", roleBg: "bg-primary/10" },
  { id: "12", title: "AI contract negotiation coach", tag: "Freelancer", icon: "🤖", roleColor: "text-emerald-300", roleBg: "bg-emerald-500/10" },
];

function RoadmapSection() {
  return (
    <section id="roadmap" className="relative py-24 lg:py-32 overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-secondary/10 to-transparent blur-3xl"></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll mb-16">
          <span className="text-label text-primary">Roadmap</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl">
            What we are building <span className="gradient-text-primary">next.</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
          {upcomingFeatures.map((feat, i) => (
            <div
              key={feat.id}
              className={`animate-on-scroll-scale stagger-${(i % 4) + 1} glass-card rounded-2xl p-6 group cursor-default relative overflow-hidden`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{feat.icon}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${feat.roleBg} ${feat.roleColor}`}>
                  {feat.tag}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface group-hover:text-primary transition">{feat.title}</h3>
              <span className="absolute bottom-4 right-4 text-xs font-bold text-on-surface-variant/20">#{feat.id}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PRICING — 3 glassmorphic plan cards (Picture 4)
   ═══════════════════════════════════════════════════════════════ */
function DashboardPricingSection({ currentPlan }: { currentPlan: string }) {
  return (
    <section id="pricing" className="relative py-24 lg:py-32 section-elevated overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll">
          <span className="text-label text-primary">Pricing</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            The cheapest insurance policy{" "}
            <span className="gradient-text-primary">you&apos;ll ever have.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            Choose a plan to suit your scanning needs. Upgrade or unlock features instantly.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto items-stretch">
          {/* Free Plan Card */}
          <div className={`animate-on-scroll-scale stagger-1 glass-card rounded-3xl p-8 flex flex-col justify-between ${currentPlan === "free" ? "ring-2 ring-primary/40 shadow-glow-primary" : ""}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-label text-on-surface-variant">Free Plan</span>
                {currentPlan === "free" && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">CURRENT</span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-on-surface">₹0</span>
                <span className="text-sm text-on-surface-variant">/ scan</span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant leading-6">
                Scan across 4 core risk categories: IP, Payment, Non-Compete, and Termination.
              </p>
              <ul className="mt-6 space-y-3">
                {["4 core risk categories", "Confidence scoring", "Plain-English explanations"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-on-surface">
                    <svg className="h-4 w-4 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-on-surface-variant/50">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Negotiation drafts
                </li>
              </ul>
            </div>
            <div className="mt-8">
              {currentPlan === "free" ? (
                <button disabled className="w-full rounded-full bg-primary/10 border border-primary/20 py-3 text-center text-sm font-semibold text-primary cursor-default">
                  Active
                </button>
              ) : (
                <button disabled className="w-full rounded-full bg-surface-container-highest/50 py-3 text-center text-sm font-semibold text-on-surface-variant/50 cursor-not-allowed">
                  Downgrade disabled
                </button>
              )}
            </div>
          </div>

          {/* Basic Plan Card */}
          <div className={`animate-on-scroll-scale stagger-2 glass-card rounded-3xl p-8 flex flex-col justify-between ${currentPlan === "basic" ? "ring-2 ring-primary/40 shadow-glow-primary" : ""}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-label text-on-surface-variant">Basic Scan</span>
                {currentPlan === "basic" && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">CURRENT</span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-on-surface">₹49</span>
                <span className="text-sm text-on-surface-variant">/ scan</span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant leading-6">
                Scan across 8 risk categories including Liability, Indemnity, Confidentiality, and Revisions.
              </p>
              <ul className="mt-6 space-y-3">
                {["8 risk categories", "Evidence-based analysis", "Financial impact assessment", "Confidence scoring", "Category labeling"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-on-surface">
                    <svg className="h-4 w-4 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-on-surface-variant/50">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Negotiation drafts
                </li>
              </ul>
            </div>
            <div className="mt-8">
              {currentPlan === "basic" ? (
                <button disabled className="w-full rounded-full bg-primary/10 border border-primary/20 py-3 text-center text-sm font-semibold text-primary cursor-default">
                  Active
                </button>
              ) : currentPlan === "premium" ? (
                <button disabled className="w-full rounded-full bg-surface-container-highest/50 py-3 text-center text-sm font-semibold text-on-surface-variant/50 cursor-not-allowed">
                  Downgrade disabled
                </button>
              ) : (
                <a href="#scan" className="block w-full rounded-full btn-secondary py-3 text-center text-sm font-semibold hover:shadow-glow-primary transition">
                  Upgrade to Basic
                </a>
              )}
            </div>
          </div>

          {/* Premium Plan Card (Featured) */}
          <div className="animate-on-scroll-scale stagger-3 relative rounded-3xl gradient-border flex flex-col">
            <div className={`glass-card rounded-3xl p-8 glow-primary-strong relative z-10 flex-1 flex flex-col justify-between ${currentPlan === "premium" ? "ring-2 ring-primary/60 shadow-glow-primary" : ""}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-label text-primary">Full Review + Fix</span>
                  {currentPlan === "premium" ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">CURRENT</span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">POPULAR</span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-on-surface">₹99</span>
                  <span className="text-sm text-on-surface-variant">/ scan</span>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant leading-6">
                  All 10 risk categories plus auto-generated counter offers, WhatsApp export, and full impact reports.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "All 10 risk categories",
                    "Auto-generated counter offers",
                    "Direct WhatsApp export",
                    "Financial impact reports",
                    "Email integration",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-on-surface">
                      <svg className="h-4 w-4 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                {currentPlan === "premium" ? (
                  <button disabled className="w-full rounded-full bg-primary/10 border border-primary/20 py-3 text-center text-sm font-semibold text-primary cursor-default">
                    Active
                  </button>
                ) : (
                  <a href="#scan" className="block w-full rounded-full btn-primary py-3 text-center text-sm font-semibold glow-primary shadow-glow-primary transition">
                    Upgrade to Premium
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TESTIMONIALS — 3 quote cards
   ═══════════════════════════════════════════════════════════════ */
const testimonials = [
  {
    quote:
      "Found a hidden Net-120 payment clause in a US client contract. TermShield saved me from 4 months of unpaid wait time. Essential tool.",
    author: "Priya S.",
    role: "UX Designer, Bengaluru",
  },
  {
    quote:
      "The 1-click negotiation messages are pure gold. I used them to remove a non-compete that would have blocked me from working with my dream clients.",
    author: "Arjun M.",
    role: "Full-Stack Developer, Pune",
  },
  {
    quote:
      "I'm an agency owner and I now run every SOW through TermShield before my team starts. It's the cheapest insurance policy we've ever had.",
    author: "Kavitha R.",
    role: "Agency Founder, Chennai",
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll">
          <span className="text-label text-primary">Testimonials</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl">
            Trusted by India&apos;s{" "}
            <span className="gradient-text-primary">independent workforce.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.author}
              className={`animate-on-scroll stagger-${i + 1} glass-card rounded-2xl p-6`}
            >
              <svg className="h-8 w-8 text-primary/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <p className="text-sm leading-7 text-on-surface/90 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold text-primary">
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{t.author}</p>
                  <p className="text-xs text-on-surface-variant">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CTA SECTION (Picture 5)
   ═══════════════════════════════════════════════════════════════ */
function CTASection({ scansCount }: { scansCount: number }) {
  return (
    <section className="relative py-24 lg:py-32 section-elevated overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-8">
          <div className="animate-on-scroll">
            {scansCount === 0 ? (
              <>
                <h2 className="text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                  Join <span className="gradient-text">12,000+</span> Indian freelancers
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-on-surface-variant text-lg">
                  Who use TermShield to protect their time, money, and intellectual property. Start scanning for free.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href="#scan"
                    className="btn-primary rounded-full px-10 py-4 text-base font-semibold glow-primary-strong"
                  >
                    Scan Your First Contract →
                  </a>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                  You and <span className="gradient-text">12,000+</span> users trust us
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-on-surface-variant text-lg">
                  Thank you for protecting your contracts and securing your independent workforce with TermShield.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD FOOTER
   ═══════════════════════════════════════════════════════════════ */
function DashboardFooter() {
  const { user } = useAuth();
  const router = useRouter();

  const handleInvoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push("/invoice");
  };

  return (
    <footer className="border-t border-outline-variant/10 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/dashboard" className="group inline-block mb-4">
              <BrandLogo iconSize={30} textClassName="text-base font-extrabold tracking-wider text-white font-sans" />
            </Link>
            <p className="text-sm text-on-surface-variant leading-6">
              The intelligent guardian for India&apos;s independent workforce. Ensuring fair play in every signature.
            </p>
          </div>

          <div>
            <h4 className="text-label text-on-surface-variant mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-on-surface-variant hover:text-primary transition">Features</a></li>
              <li><a href="#pricing" className="text-sm text-on-surface-variant hover:text-primary transition">Pricing</a></li>
              <li>
                <button
                  onClick={handleInvoiceClick}
                  className="text-sm text-on-surface-variant hover:text-primary transition text-left"
                >
                  Invoice Builder
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-label text-on-surface-variant mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-label text-on-surface-variant mb-4">Account</h4>
            <ul className="space-y-3">
              <li><Link href="/history" className="text-sm text-on-surface-variant hover:text-primary transition">Past Scans</Link></li>
              <li><Link href="/settings" className="text-sm text-on-surface-variant hover:text-primary transition">Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-outline-variant/10 pt-8 text-center">
          <p className="text-xs text-on-surface-variant/60">
            © 2026 TermShield. Built for freelancers, by freelancers.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userPlan, setUserPlan] = useState<string>("free");
  const [scansCount, setScansCount] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  useScrollAnimations();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchUserData() {
      if (!user || !session) return;
      try {
        // Fetch user plan from the users table
        const { data: profile } = await supabase
          .from("users")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile?.plan) {
          setUserPlan(profile.plan);
        }

        // Fetch scan count via the authenticated history API to bypass RLS issues
        const res = await fetch("/api/scan/history", {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setScansCount((data.history ?? []).length);
        }
      } catch (err) {
        console.error("Error fetching dashboard user data:", err);
      } finally {
        setDataLoading(false);
      }
    }

    if (user && session) {
      fetchUserData();
    }
  }, [user, session]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c16] text-on-surface relative z-10 px-6">
        <div className="relative p-8 rounded-[2rem] border border-white/10 bg-[#1c1f2d]/90 backdrop-blur-2xl shadow-2xl glass-card text-center max-w-sm w-full space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-2xl shadow-primary/10">
            <BrandLogo showText={false} iconSize={36} variant="simple" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-wide">Accessing Legal Vault</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Establishing a secure connection to the compliance databases...
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="bg-background text-on-surface min-h-screen page-transition-enter">
        <HeroSection />
        <FeaturesSection plan={userPlan} scansCount={scansCount} />
        <WhatsNewSection />
        <WorkspaceSection scansCount={scansCount} />
        <DashboardScanSection scansCount={scansCount} />
        <RoadmapSection />
        <DashboardPricingSection currentPlan={userPlan} />
        <TestimonialsSection />
        <CTASection scansCount={scansCount} />
      </main>
      <DashboardFooter />
    </>
  );
}
