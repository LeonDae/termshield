import "./globals.css";

import { Inter } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TermShield — AI Contract Risk Detection for Indian Freelancers",
  description:
    "TermShield scans your client contracts for risky clauses across IP, Payment, Non-Compete, and Termination categories. Plain-English risk detection built on thousands of real freelance contracts.",
  keywords: [
    "contract scanner",
    "freelancer protection",
    "contract risk",
    "AI legal analysis",
    "Indian freelancer",
    "TermShield",
  ],
  openGraph: {
    title: "TermShield — AI Contract Risk Detection",
    description:
      "Scan your contracts for hidden risks in seconds. Built for India's independent workforce.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-canvas text-ink antialiased font-inter">
        {children}
      </body>
    </html>
  );
}
