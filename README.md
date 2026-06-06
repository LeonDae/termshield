<div align="center">

# 🛡️ TermShield

**Intelligent AI-Powered Contract Protection for India's Freelancers & Agencies**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)

*Stop signing contracts that cost you lakhs. Plain-English risk detection in under 60 seconds.*

</div>

<br />

## 🌟 What is TermShield?

**TermShield** is a state-of-the-art web application acting as a first line of legal defense for freelancers, independent contractors, and small agencies. By parsing uploaded PDF contracts and feeding them through an advanced semantic RAG (Retrieval-Augmented Generation) pipeline powered by Google Gemini, TermShield analyzes critical legal terms and translates complex legalese into clear, actionable, financial-focused advice.

It not only highlights predatory clauses but also equips users with professional, AI-generated negotiation drafts to confidently push back and secure better terms.

---

## 🚨 The Problem It Solves

Most freelancers and small agencies lose money not because of a lack of skill, but because they unknowingly sign terms they cannot fulfill or that inherently work against them. Contracts often contain hidden traps:

- 💸 **Delayed Payments:** Net-90 or Net-120 terms that squeeze your cash flow and operating runway.
- 🔓 **Predatory IP Ownership:** Clauses where intellectual property rights transfer entirely *before* your invoice is fully cleared.
- 🚪 **Vague Termination:** Terms allowing clients to walk away instantly without paying for completed or in-progress work.
- ⛓️ **Restrictive Non-Competes:** Clauses that effectively block freelancers from working in their own industry with other clients.

**TermShield** automatically flags these patterns, estimating potential financial losses and giving you the leverage to negotiate.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🤖 Automatic Risk Labeling** | AI identifies every clause and categorizes it (Critical Risk, Important, Safe) based on industry standards. |
| **💰 Financial Impact Scoring** | Estimates the potential loss in ₹ (INR) based on your project value, making the cost of bad terms concrete. |
| **✍️ 1-Click Negotiation Drafting** | Generates polite but firm negotiation messages for every risky clause. Just copy, paste, and send to your client. |
| **📊 Smart Invoice Builder** | A premium CRM-style billing studio to build, customize, and calculate professional invoices with itemized tax and profit-margin calculators. |
| **📱 Instant Export & Sharing** | Send your risk reports and negotiation drafts directly to WhatsApp or Gmail to keep your legal strategy organized. |

---

## 🛠️ The Tech Stack

TermShield is built on a modern, high-performance, and secure serverless architecture for a flawless user experience.

### **Frontend & Design**
- **Framework:** Next.js 14 (App Router) & React 18
- **Language:** TypeScript for end-to-end type safety
- **Styling:** Tailwind CSS combined with bespoke glassmorphism, ambient animations, and premium mesh gradients for a breathtaking aesthetic.

### **AI Core & Document Processing**
- **Large Language Model:** Google Gemini API (`gemini-2.5-flash`)
- **Embeddings & RAG:** LangChain (`text-embedding-004` & RecursiveCharacterTextSplitter)
- **PDF Extraction:** `pdf2json` optimized for serverless edge runtimes

### **Backend, Auth & Integrations**
- **Database & Auth:** Supabase (PostgreSQL) for secure user sessions, scan logs, and risk storage
- **Validation:** Zod for robust, type-safe API schemas
- **Payments:** Razorpay integration for premium tier processing
- **Transactional Emails:** Resend for forwarding detailed reports and notifications

---

## 🔮 Upcoming Features

The roadmap for TermShield is packed with features designed to empower independent professionals further:

- **📈 Rate Calculators:** Helping freelancers determine minimum viable project fees based dynamically on contract risk levels.
- **📄 AI Proposal/SOW Builder:** Generate contract templates that are pre-optimized and guaranteed to pass TermShield criteria.
- **💬 WhatsApp Overdue Alerts:** Automated, polite follow-ups sent to clients on behalf of the freelancer when milestones pass unpaid.
- **⚖️ Light Escrow Integration:** Holding project payments securely before the transfer of source code or intellectual property.
- **🤝 Multi-User Agency Workspaces:** Allowing teams to review contracts collaboratively and assign negotiation tasks.

---

<div align="center">
  <p>Built with ❤️ to protect the creators, builders, and freelancers of tomorrow.</p>
</div>
