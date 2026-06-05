"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UploadForm } from "@/components/UploadForm";

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
      ".animate-on-scroll, .animate-on-scroll-scale, .animate-on-scroll-left, .animate-on-scroll-right, .animate-turn-in-left, .animate-turn-in-right"
    );
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

const SECTIONS = ["features", "how-it-works", "pricing", "testimonials"];

/* ═══════════════════════════════════════════════════════════════
   NAV — Floating glassmorphic navbar
   ═══════════════════════════════════════════════════════════════ */
function FloatingNav() {
  const navRef = useRef<HTMLElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState("features");
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check local storage for preference
    const savedTheme = localStorage.getItem("termshield-theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.body.classList.add("light-theme");
    } else {
      setTheme("dark");
      document.body.classList.remove("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("termshield-theme", nextTheme);
    if (nextTheme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  };

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

    const observeIds = ["features", "whats-new", "how-it-works", "pricing", "testimonials"];
    observeIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const measureTabs = useCallback(() => {
    const activeIndex = SECTIONS.indexOf(activeSection);
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
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-on-surface">
            Term<span className="text-primary">Shield</span>
          </span>
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
            {SECTIONS.map((section, i) => {
              const labels: Record<string, string> = {
                features: "Features",
                "how-it-works": "How it Works",
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

          {/* Glowing What's New Tab */}
          <a
            href="#whats-new"
            className="px-3.5 py-1.5 text-[11px] font-semibold text-primary rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/25 transition-all duration-300 shadow-[0_0_15px_rgba(78,222,163,0.2)] hover:shadow-[0_0_20px_rgba(78,222,163,0.4)] uppercase tracking-wider flex items-center gap-1.5 animate-pulse"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            What&apos;s New
          </a>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-all duration-300 hover:scale-[1.05]"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              // Sun Icon (Orange/Amber)
              <svg className="h-4 w-4 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              // Moon Icon (Gold/Orange-Gold)
              <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/history"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition px-3 py-1.5 rounded-full hover:bg-surface-container-high"
              >
                History
              </Link>
              <Link href="/settings" className="flex items-center gap-2 group p-1.5 rounded-full hover:bg-surface-container-high transition">
                <span className="text-sm font-medium text-on-surface truncate max-w-[120px] hidden sm:block">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                </div>
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-secondary rounded-full px-5 py-2.5 text-sm hidden sm:inline-flex"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Get Started
              </Link>
            </>
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
                href="#how-it-works"
                className="btn-secondary rounded-full px-8 py-3.5 text-sm"
              >
                See How It Works
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

/* ═══════════════════════════════════════════════════════════════
   FEATURES — 4 glassmorphic cards with scroll animation
   ═══════════════════════════════════════════════════════════════ */
const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    title: "Automatic Risk Labeling",
    description:
      "Our AI identifies every clause and labels it based on industry standards for Indian freelancers. Instant clarity on what's normal and what's predatory.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "Financial Impact Scoring",
    description:
      "We don't just say \"this is risky\". We estimate the potential loss in ₹ based on your project value. Seeing the cost makes negotiation a priority.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "1-Click Negotiation Drafting",
    description:
      "Don't know how to ask for changes? We generate polite but firm negotiation messages for every risky clause. Just copy, paste, and send.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: "WhatsApp & Email Export",
    description:
      "Send your risk reports and negotiation drafts directly to your WhatsApp or Gmail. Keep your legal strategy organized where you communicate with clients.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Smart Invoice Builder",
    description:
      "A premium CRM-style billing studio. Build, customize, and calculate professional invoices with itemized tax/discounts and export to PDF instantly.",
  }
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center animate-on-scroll">
            <span className="text-label text-primary">Features</span>
            <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              Everything you need to{" "}
              <span className="gradient-text-primary">protect your work.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
              Most freelancers lose money not because they lack skill, but because they sign terms they can&apos;t fulfill. We solve that in seconds.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-on-scroll-scale stagger-${i + 1} glass-card rounded-2xl p-6 group cursor-default`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-glow-primary">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-on-surface">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{feature.description}</p>
              </div>
            ))}
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
  const { user } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleTryNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push("/invoice");
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <section id="whats-new" className="relative py-24 lg:py-32 section-recessed overflow-hidden">
      {/* Background glow and graphics */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101320]/80 backdrop-blur-md animate-fade-in no-print">
          <div className="relative w-full max-w-md p-8 rounded-3xl border border-primary/20 bg-[#1c1f2d]/95 shadow-2xl glass-card text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Authentication Required</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Log in or create a TermShield account to access the premium Smart Invoice Builder and save your progress.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 btn-secondary py-3 rounded-full text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  router.push("/login?redirect=/invoice");
                }}
                className="flex-1 btn-primary py-3 rounded-full text-xs font-semibold glow-primary"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          
          {/* Left Column: Text description and CTA */}
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

            <ul className="space-y-3.5 text-sm text-[#bbcabf]">
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
              <button
                onClick={handleTryNow}
                className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold glow-primary-strong flex items-center gap-2"
              >
                Try Invoice Builder Now
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Right Column: Visual Mock of the Invoice Dashboard */}
          <div 
            onClick={handleTryNow}
            className="relative cursor-pointer group animate-on-scroll-scale"
          >
            {/* Ambient hover glow */}
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
            
            {/* Main Mock Container */}
            <div className="relative rounded-[2rem] border border-[#3c4a42]/30 bg-[#1c1f2d]/90 backdrop-blur-2xl p-5 shadow-2xl overflow-hidden glass-card flex gap-4 h-[440px] md:h-[500px]">
              
              {/* Dashboard Left Sidebar */}
              <div className="w-12 h-full flex flex-col items-center py-2 bg-[#101320]/60 rounded-2xl border border-white/[0.03] space-y-4">
                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-[#bbcabf] hover:text-white transition">
                  {/* Grid Menu Icon */}
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/></svg>
                </div>
                <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">+</div>
                <div className="text-[#bbcabf]/50 hover:text-[#bbcabf] transition">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
                </div>
                <div className="h-px w-6 bg-white/[0.05]" />
                <div className="text-[#bbcabf]/70 hover:text-white transition">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-9 0h.5A.5.5 0 0 1 3 8v2a2 2 0 0 0 2 2h3a.5.5 0 0 1 0 1H5a3 3 0 0 1-3-3V8a.5.5 0 0 1 0-1m10-7h-.5a.5.5 0 0 1-.5-.5V.5A.5.5 0 0 1 12 0h1a3 3 0 0 1 3 3v2.5a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2"/></svg>
                </div>
                <div className="text-[#bbcabf]/50">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/><path d="M6 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/></svg>
                </div>
                <div className="text-[#bbcabf]/50">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1"/></svg>
                </div>
              </div>

              {/* Mock Dashboard Main Workspace */}
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">Invoices</h4>
                    <p className="text-[10px] text-[#bbcabf]">123 invoices</p>
                  </div>
                  <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live Demo
                  </span>
                </div>

                {/* Mock Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  
                  {/* Draft */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-white/[0.02] flex flex-col justify-between">
                    <span className="text-[8px] text-[#bbcabf] font-bold">Draft</span>
                    <span className="text-xs font-bold text-white mt-1">$12,253.54</span>
                    <span className="text-[8px] text-[#bbcabf]/60 mt-0.5">3 Invoices</span>
                  </div>

                  {/* Unpaid */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-[#d0bcff]/10 flex flex-col justify-between">
                    <span className="text-[8px] text-[#d0bcff] font-bold">Unpaid</span>
                    <span className="text-xs font-bold text-[#d0bcff] mt-1">$50,650.56</span>
                    <span className="text-[8px] text-[#bbcabf]/60 mt-0.5">22 Invoices</span>
                  </div>

                  {/* Overdue */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/[0.02] animate-pulse" />
                    <span className="text-[8px] text-red-400 font-bold relative z-10">Overdue</span>
                    <span className="text-xs font-bold text-red-400 mt-1 relative z-10">$36,238.78</span>
                    <span className="text-[8px] text-[#bbcabf]/60 mt-0.5 relative z-10">6 Invoices</span>
                  </div>

                  {/* Paid */}
                  <div className="p-2.5 bg-[#101320]/80 rounded-xl border border-primary/20 flex flex-col justify-between">
                    <span className="text-[8px] text-primary font-bold">Paid</span>
                    <span className="text-xs font-bold text-[#4edea3] mt-1">$67,677.90</span>
                    <span className="text-[8px] text-[#bbcabf]/60 mt-0.5">78 Invoices</span>
                  </div>

                </div>

                {/* Mock Category Filters */}
                <div className="flex flex-wrap gap-1.5 py-1">
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">All (127)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#bbcabf]">Paid (67)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#bbcabf]">Overdue (24)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#bbcabf]">Unpaid (32)</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-[#bbcabf]">Draft (23)</span>
                </div>

                {/* Mock Grid List of Invoices */}
                <div className="flex-1 overflow-y-auto pr-0.5 space-y-2 max-h-[200px] md:max-h-[250px] scrollbar-thin">
                  
                  {/* Grid layout for mock invoices */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    
                    {/* Invoice Card 1 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-white/5 text-[#bbcabf]">Final Version</span>
                        <span className="text-[7px] text-[#bbcabf]/60">#0002</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$75,250</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#bbcabf] font-semibold truncate max-w-[80px]">Ella Grace Johnson</span>
                        <span className="text-[7px] text-[#bbcabf]/50">07/15/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 2 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-white/5 text-[#bbcabf]">Revised Proposal</span>
                        <span className="text-[7px] text-[#bbcabf]/60">#0003</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$120,500</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#bbcabf] font-semibold truncate max-w-[80px]">Noah William Smith</span>
                        <span className="text-[7px] text-[#bbcabf]/50">08/22/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 3 */}
                    <div className="p-3 bg-[#101320]/50 border border-white/[0.04] rounded-xl flex flex-col justify-between hover:border-primary/20 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Cost Estimation</span>
                        <span className="text-[7px] text-[#bbcabf]/60">#0004</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1.5">$50,300</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#bbcabf] font-semibold truncate max-w-[80px]">Ava Sophia Lee</span>
                        <span className="text-[7px] text-[#bbcabf]/50">09/10/2024</span>
                      </div>
                    </div>

                    {/* Invoice Card 4 */}
                    <div className="p-3 bg-[#101320]/50 border border-[#4edea3]/20 bg-[#4edea3]/[0.02] rounded-xl flex flex-col justify-between hover:border-primary/40 transition duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">✓ Service Charge</span>
                        <span className="text-[7px] text-[#bbcabf]/60">#0007</span>
                      </div>
                      <p className="text-sm font-extrabold text-[#4edea3] mt-1.5">$110,200</p>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="text-[8px] text-[#bbcabf] font-semibold truncate max-w-[80px]">Elijah James Davis</span>
                        <span className="text-[7px] text-[#bbcabf]/50">12/01/2024</span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Ambient visual overlays */}
              <div className="absolute bottom-[-10%] right-[-10%] w-[120px] h-[120px] bg-[#4edea3]/10 blur-xl pointer-events-none rounded-full group-hover:bg-[#4edea3]/25 transition-all duration-700" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS — 4-step timeline with scroll-triggered reveals
   ═══════════════════════════════════════════════════════════════ */
const steps = [
  {
    step: "01",
    title: "Upload Contract",
    description: "Securely upload your PDF or paste contract text. All data is encrypted with AES-256 protocols.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "AI Scan",
    description: "Our advanced LLM scans for 4 core risk patterns: IP Clauses, Payment, Non-compete, and Termination.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 5.432a2.25 2.25 0 01-2.056 1.318H9.526a2.25 2.25 0 01-2.056-1.318L5 14.5m14 0H5" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Risk Breakdown",
    description: "Get a clear, plain-English report with prioritized risks and detailed financial impact assessments.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "One-Click Negotiate",
    description: "Use pre-drafted negotiation messages to protect your rights. Instant professional responses ready to send.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 section-elevated overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll">
          <span className="text-label text-primary">How It Works</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            From upload to protection in{" "}
            <span className="gradient-text-primary">60 seconds.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className={`animate-on-scroll stagger-${i + 1} relative`}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}

              <div className="glass-card rounded-2xl p-6 text-center group relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:scale-110 group-hover:shadow-glow-primary">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-primary/50 tracking-widest">STEP {step.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-on-surface">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCAN SECTION — Upload form integration point
   ═══════════════════════════════════════════════════════════════ */
function ScanSection() {
  return (
    <section id="scan" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center animate-on-scroll mb-12">
            <span className="text-label text-primary">Try It Now</span>
            <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl">
              Scan your contract in{" "}
              <span className="gradient-text-primary">seconds.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
              Upload a PDF or paste contract text. We&apos;ll scan it for risky clauses across 4 categories in under 60 seconds.
            </p>
          </div>
          <div className="animate-on-scroll-scale stagger-2">
            <UploadFormInline />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INLINE UPLOAD FORM — Embedded on landing page
   (Imports the real UploadForm component)
   ═══════════════════════════════════════════════════════════════ */
function UploadFormInline() {
  return <UploadForm />;
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
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 perspective-wrapper">
        <div className="text-center animate-on-scroll mb-16">
          <span className="text-label text-primary">Coming Soon</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            The future of <span className="gradient-text">freelance protection.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            We are building a comprehensive suite to secure every aspect of your independent business.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingFeatures.map((feat, i) => {
            const isLeft = i % 2 === 0;
            const animationClass = isLeft ? 'animate-turn-in-left' : 'animate-turn-in-right';
            return (
              <div
                key={feat.id}
                className={`${animationClass} stagger-${(i % 3) + 1} marble-card rounded-2xl p-5 flex items-center gap-4`}
              >
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-surface-container-highest shadow-inner text-xl">
                  {feat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface truncate pr-2" title={feat.title}>
                    {feat.title}
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${feat.roleColor} ${feat.roleBg}`}>
                      {feat.tag}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICING — 2 glassmorphic plan cards
   ═══════════════════════════════════════════════════════════════ */
function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 lg:py-32 section-elevated overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center animate-on-scroll">
          <span className="text-label text-primary">Pricing</span>
          <h2 className="mt-3 text-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            The cheapest insurance policy{" "}
            <span className="gradient-text-primary">you&apos;ll ever have.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 max-w-3xl mx-auto">
          {/* Basic Plan */}
          <div className="animate-on-scroll-scale stagger-1 glass-card rounded-3xl p-8">
            <span className="text-label text-on-surface-variant">Basic Scan</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-on-surface">₹49</span>
              <span className="text-sm text-on-surface-variant">/ scan</span>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant leading-6">
              Full risk analysis across all 4 categories with category labeling.
            </p>
            <ul className="mt-6 space-y-3">
              {["Full risk analysis", "Category labeling", "Confidence scoring", "Plain-English explanations"].map((f) => (
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
            <a href="#scan" className="mt-8 block w-full rounded-full btn-secondary py-3 text-center text-sm font-semibold">
              Start Basic Scan
            </a>
          </div>

          {/* Premium Plan — Featured */}
          <div className="animate-on-scroll-scale stagger-2 relative rounded-3xl gradient-border">
            <div className="glass-card rounded-3xl p-8 glow-primary-strong relative z-10 h-full">
              <div className="flex items-center justify-between">
                <span className="text-label text-primary">Full Review + Fix</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">POPULAR</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-on-surface">₹99</span>
                <span className="text-sm text-on-surface-variant">/ scan</span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant leading-6">
                Everything in Basic plus negotiation drafts, WhatsApp export, and liability scoring.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Everything in Basic",
                  "1-click negotiation drafts",
                  "Direct WhatsApp export",
                  "Liability score report",
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
              <a href="#scan" className="mt-8 block w-full rounded-full btn-primary py-3 text-center text-sm font-semibold">
                Start Premium Scan
              </a>
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
   CTA — Final conversion section
   ═══════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section className="relative py-24 lg:py-32 section-elevated overflow-hidden">
      <div className="mesh-gradient-subtle relative">
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-8">
          <div className="animate-on-scroll">
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
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  const { user } = useAuth();
  const router = useRouter();

  const handleInvoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push("/invoice");
    } else {
      router.push("/login?redirect=/invoice");
    }
  };

  return (
    <footer className="border-t border-outline-variant/10 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-base font-bold text-on-surface">
                Term<span className="text-primary">Shield</span>
              </span>
            </div>
            <p className="text-sm text-on-surface-variant leading-6">
              The intelligent guardian for India&apos;s independent workforce. Ensuring fair play in every signature.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition hover:bg-primary/10 hover:text-primary">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition hover:bg-primary/10 hover:text-primary">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
            </div>
          </div>

          {/* Product */}
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
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Documentation</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">API Reference</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-label text-on-surface-variant mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Security</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition">Contact Support</a></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-label text-on-surface-variant mb-4">Account</h4>
            <ul className="space-y-3">
              <li><Link href="/login" className="text-sm text-on-surface-variant hover:text-primary transition">Login</Link></li>
              <li><Link href="/signup" className="text-sm text-on-surface-variant hover:text-primary transition">Sign Up</Link></li>
              <li><Link href="/settings" className="text-sm text-on-surface-variant hover:text-primary transition">Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-outline-variant/10 pt-8 text-center">
          <p className="text-xs text-on-surface-variant/60">
            © 2026 TermShield. forthefreelancersbyafreelancer built by Ditsu Kundu.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE — Assembles all sections
   ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  useScrollAnimations();

  return (
    <>
      <FloatingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhatsNewSection />
        <HowItWorksSection />
        <ScanSection />
        <RoadmapSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
