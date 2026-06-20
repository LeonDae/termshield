import React from "react";

interface BrandLogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textClassName?: string;
  variant?: "default" | "glass" | "simple";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  iconSize = 36,
  showText = true,
  textClassName = "text-xl font-bold tracking-wider text-white uppercase font-sans",
  variant = "default",
}) => {
  // SVG of the tilted document stack logo with premium gradient, drop shadows, and effects.
  const renderIcon = () => (
    <div className={`relative flex items-center justify-center shrink-0 ${variant === "glass" ? "p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-2xl shadow-primary/10" : ""}`}>
      {/* Background glow effect for premium aesthetics */}
      {variant !== "simple" && (
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500" />
      )}
      
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 select-none transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Main purple gradient for the accent underline/borders */}
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          
          {/* Page gradients for depth */}
          <linearGradient id="pageGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          
          <linearGradient id="pageGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" opacity="0.95" />
            <stop offset="100%" stopColor="#cbd5e1" opacity="0.9" />
          </linearGradient>

          {/* Smooth drop shadow filter */}
          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Backmost sheet (Sheet 1) */}
        <path
          d="M18 36 L44 32 L36 78 L12 82 Z"
          fill="url(#pageGrad2)"
          filter="url(#logoShadow)"
          opacity="0.8"
        />

        {/* 2. Middle sheet (Sheet 2) */}
        <path
          d="M23 26 L55 21 L45 71 L15 76 Z"
          fill="url(#pageGrad2)"
          filter="url(#logoShadow)"
          opacity="0.9"
        />

        {/* 3. Purple accent bar directly behind front sheet */}
        <path
          d="M27 18 L64 12 L53 66 L18 72 Z"
          fill="url(#purpleGrad)"
          filter="url(#logoShadow)"
        />

        {/* 4. Frontmost sheet (Sheet 3) */}
        <path
          d="M31 16 L65 11 L55 61 L23 66 Z"
          fill="url(#pageGrad1)"
          filter="url(#logoShadow)"
        />

        {/* 5. Curved sheets fanning at the bottom left */}
        <path
          d="M21 78 C 28 82, 38 84, 48 82"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M26 84 C 33 88, 43 90, 53 88"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M31 90 C 38 94, 48 96, 58 94"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );

  return (
    <div className={`flex items-center gap-3 group select-none ${className}`}>
      {renderIcon()}
      {showText && (
        <span className={`${textClassName} tracking-wider font-extrabold transition-colors duration-300 group-hover:text-primary-fixed`}>
          TERM<span className="text-primary-fixed-dim">SHIELD</span>
        </span>
      )}
    </div>
  );
};
