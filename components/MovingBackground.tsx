"use client";

import { useEffect, useState } from "react";

export function MovingBackground() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#0a0c16]">
      {/* Orb 1: Deep Violet/Purple (Modified from Green/Teal) */}
      <div 
        className="absolute transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${scrollY * -0.12}px)`,
          top: "2%",
          left: "-10%",
        }}
      >
        <div className="w-[80vw] h-[80vw] max-w-[750px] max-h-[750px] rounded-full bg-violet-600/[0.07] blur-[140px] animate-blob-float-1" />
      </div>

      {/* Orb 2: Secondary Violet/Indigo */}
      <div 
        className="absolute transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${scrollY * 0.08}px)`,
          bottom: "10%",
          right: "-15%",
        }}
      >
        <div className="w-[80vw] h-[80vw] max-w-[750px] max-h-[750px] rounded-full bg-indigo-600/[0.06] blur-[150px] animate-blob-float-2" />
      </div>

      {/* Orb 3: Accent Purple */}
      <div 
        className="absolute transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${scrollY * -0.06}px)`,
          top: "40%",
          left: "20%",
        }}
      >
        <div className="w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-purple-500/[0.05] blur-[120px] animate-blob-float-3" />
      </div>

      {/* Concentric Tech HUD circles in background */}
      <div className="absolute top-[8%] right-[10%] w-[450px] h-[450px] opacity-[0.06] pointer-events-none animate-[spin_100s_linear_infinite]">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-violet-500" fill="none">
          <circle cx="50" cy="50" r="48" strokeWidth="0.3" strokeDasharray="2 4" />
          <circle cx="50" cy="50" r="42" strokeWidth="0.8" strokeDasharray="12 6" />
          <circle cx="50" cy="50" r="32" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="30" strokeWidth="1.2" strokeDasharray="1 6" />
          <circle cx="50" cy="50" r="18" strokeWidth="0.3" strokeDasharray="4 4" />
          <path d="M 50 1 L 50 99 M 1 50 L 99 50" strokeWidth="0.3" strokeDasharray="2 3" />
          <rect x="47" y="47" width="6" height="6" strokeWidth="0.4" />
        </svg>
      </div>

      <div className="absolute bottom-[5%] left-[5%] w-[380px] h-[380px] opacity-[0.04] pointer-events-none animate-[spin_120s_linear_infinite_reverse]">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-indigo-400" fill="none">
          <circle cx="50" cy="50" r="49" strokeWidth="0.3" strokeDasharray="4 6" />
          <circle cx="50" cy="50" r="44" strokeWidth="0.6" strokeDasharray="20 10" />
          <circle cx="50" cy="50" r="35" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="25" strokeWidth="1.5" strokeDasharray="2 8" />
          <path d="M 50 2 L 50 98 M 2 50 L 98 50" strokeWidth="0.3" strokeDasharray="5 5" />
        </svg>
      </div>

      {/* Tech corner alignment crop marks on viewport */}
      <div className="absolute top-20 left-6 w-4 h-4 border-t border-l border-white/5 pointer-events-none hidden lg:block" />
      <div className="absolute top-20 right-6 w-4 h-4 border-t border-r border-white/5 pointer-events-none hidden lg:block" />
      <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-white/5 pointer-events-none hidden lg:block" />
      <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-white/5 pointer-events-none hidden lg:block" />

      {/* Digital Grid Overlay - modified opacity for technical density */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.035] mix-blend-overlay" />
    </div>
  );
}
