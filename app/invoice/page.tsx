"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// --- TYPES ---
interface InvoiceItem {
  id: string;
  category: string; // labor, design, development, research, consulting, license, hosting, cloud/API, material, revision, misc
  title: string;
  description: string;
  quantity: number;
  unit: string; // hours, items, months, etc.
  rate: number;
  discount: number; // item discount %
  frameworks: string[]; // e.g. ["React", "Next.js"]
  notes: string;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  company: string;
  taxId: string;
  address: string;
}

interface FreelancerInfo {
  name: string;
  email: string;
  company: string;
  taxId: string;
  address: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  clientId: string;
  budget: number;
  status: "active" | "completed" | "on-hold";
}

interface Invoice {
  id: string;
  title: string;
  invoiceNumber: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  issueDate: string;
  dueDate: string;
  currency: string;
  client: ClientInfo;
  freelancer: FreelancerInfo;
  items: InvoiceItem[];
  overallDiscount: number; // %
  taxRate: number; // %
  taxLabel: string; // GST, VAT, etc.
  expenses: number; // COGS/costs for margin calculations
  estimatedBudget: number; // comparison baseline
  notes: string;
  paymentTerms: string;
  tags: string[];
  isBookmarked: boolean;
  recurring: {
    enabled: boolean;
    frequency: "Weekly" | "Monthly" | "Quarterly";
    nextDate: string;
  };
}

interface HistoryLog {
  id: string;
  invoiceId: string;
  timestamp: string;
  message: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

// --- DEFAULT INITIAL STATE ---
const DEFAULT_FREELANCER: FreelancerInfo = {
  name: "Ditsu Kundu",
  email: "ditsu@forthefreelancers.com",
  company: "Freelance Dev Studio",
  taxId: "GSTIN-29AAAFD887B1Z3",
  address: "Indiranagar, Bengaluru, KA - 560038"
};

const DEFAULT_CLIENTS: ClientInfo[] = [
  {
    id: "client-1",
    name: "Jane Doe",
    email: "jane@acme.com",
    company: "Acme Corporation",
    taxId: "GSTIN-07ACMEP9988D1Z2",
    address: "Tech Park Phase II, Sector 62, Noida, UP - 201301"
  },
  {
    id: "client-2",
    name: "Tony Stark",
    email: "pepper@stark.com",
    company: "Stark Industries",
    taxId: "EIN-99-8877665",
    address: "10880 Malibu Point, Malibu, CA - 90265"
  }
];

const DEFAULT_PROJECTS: ProjectInfo[] = [
  {
    id: "proj-1",
    name: "Acme SaaS MVP",
    clientId: "client-1",
    budget: 150000,
    status: "active"
  },
  {
    id: "proj-2",
    name: "Arc Reactor Web Portal",
    clientId: "client-2",
    budget: 850000,
    status: "completed"
  }
];

const PRESET_BOOKMARKS: Omit<InvoiceItem, "id">[] = [
  {
    category: "consulting",
    title: "Senior Consulting Hour",
    description: "Technical architecture roadmap and API design advisory session",
    quantity: 1,
    unit: "hours",
    rate: 3500,
    discount: 0,
    frameworks: ["Architecture", "System Design"],
    notes: "Billed on actual hours logged"
  },
  {
    category: "development",
    title: "Next.js Development",
    description: "Responsive React frontend build with Tailwind CSS and Next.js App Router",
    quantity: 40,
    unit: "hours",
    rate: 2200,
    discount: 5,
    frameworks: ["React", "Next.js", "Tailwind CSS"],
    notes: "Weekly cycle sprint deliverables"
  },
  {
    category: "hosting",
    title: "Vercel Production Hosting",
    description: "Vercel Pro account seat allocation and custom domain deployment config",
    quantity: 1,
    unit: "months",
    rate: 1600,
    discount: 0,
    frameworks: ["Vercel", "DNS"],
    notes: "Rebilled cost"
  }
];

const CATEGORIES = [
  { id: "labor", label: "💻 Labor" },
  { id: "design", label: "🎨 Design" },
  { id: "development", label: "⚡ Development" },
  { id: "research", label: "🔬 Research" },
  { id: "consulting", label: "🤝 Consulting" },
  { id: "license", label: "🔑 License" },
  { id: "hosting", label: "🌐 Hosting" },
  { id: "cloud/API", label: "☁️ Cloud/API" },
  { id: "material", label: "📦 Material" },
  { id: "revision", label: "🔄 Revision" },
  { id: "misc", label: "📎 Misc" }
];

const FRAMEWORK_PRESETS = [
  "React", "Next.js", "Tailwind CSS", "TypeScript", "Node.js", 
  "Prisma", "Supabase", "PostgreSQL", "Figma", "Stripe", "Docker"
];

const INITIAL_INVOICE = (num: number): Invoice => {
  const issueDate = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return {
    id: `inv-${Date.now()}-${num}`,
    title: `SaaS Platform Deliverable #${num}`,
    invoiceNumber: `TS-2026-${String(num).padStart(3, "0")}`,
    status: "Draft",
    issueDate,
    dueDate,
    currency: "INR",
    client: DEFAULT_CLIENTS[0],
    freelancer: DEFAULT_FREELANCER,
    items: [
      {
        id: `item-${Date.now()}-1`,
        category: "development",
        title: "Next.js Admin Dashboard",
        description: "Custom admin interface with analytics charting, user roles control, and CSV exports.",
        quantity: 32,
        unit: "hours",
        rate: 2500,
        discount: 0,
        frameworks: ["Next.js", "React", "TypeScript"],
        notes: "Completed according to milestones"
      },
      {
        id: `item-${Date.now()}-2`,
        category: "design",
        title: "Landing Page Wireframing",
        description: "Figma interactive prototypes and high-fidelity mobile-responsive mockups.",
        quantity: 12,
        unit: "hours",
        rate: 1800,
        discount: 10,
        frameworks: ["Figma"],
        notes: "Approved by client on June 3"
      }
    ],
    overallDiscount: 0,
    taxRate: 18,
    taxLabel: "GST",
    expenses: 12500,
    estimatedBudget: 120000,
    notes: "Thank you for your business. Please review the scanned clauses to make sure payment is settled within 30 days.",
    paymentTerms: "Bank Transfer or UPI. Net 30 days. 2% interest per month for delayed payment.",
    tags: ["Product launch", "Web App"],
    isBookmarked: false,
    recurring: {
      enabled: false,
      frequency: "Monthly",
      nextDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    }
  };
};

export default function SmartInvoiceBuilder() {
  const { user } = useAuth();
  
  // --- STATES ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>("");
  const [savedClients, setSavedClients] = useState<ClientInfo[]>(DEFAULT_CLIENTS);
  const [savedProjects, setSavedProjects] = useState<ProjectInfo[]>(DEFAULT_PROJECTS);
  const [bookmarkedItems, setBookmarkedItems] = useState<InvoiceItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"items" | "client" | "project" | "settings" | "bookmarks" | "templates" | "history">("items");
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Custom interactive state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [newClientForm, setNewClientForm] = useState({ name: "", email: "", company: "", taxId: "", address: "" });
  const [newProjectForm, setNewProjectForm] = useState({ name: "", clientId: "", budget: 0 });
  const [customTagInput, setCustomTagInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOCALSTORAGE PERSISTENCE ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("termshield_invoice_data");
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.invoices && parsed.invoices.length > 0) {
            setInvoices(parsed.invoices);
            setActiveInvoiceId(parsed.activeInvoiceId || parsed.invoices[0].id);
          } else {
            const init = [INITIAL_INVOICE(1)];
            setInvoices(init);
            setActiveInvoiceId(init[0].id);
          }
          if (parsed.savedClients) setSavedClients(parsed.savedClients);
          if (parsed.savedProjects) setSavedProjects(parsed.savedProjects);
          if (parsed.bookmarkedItems) setBookmarkedItems(parsed.bookmarkedItems);
          if (parsed.historyLogs) setHistoryLogs(parsed.historyLogs);
        } catch (e) {
          console.error("Error loading invoice builder localstorage:", e);
        }
      } else {
        const init = [INITIAL_INVOICE(1)];
        setInvoices(init);
        setActiveInvoiceId(init[0].id);
        
        // Populate default bookmarked items from preset
        const presets = PRESET_BOOKMARKS.map((p, idx) => ({
          ...p,
          id: `bm-${Date.now()}-${idx}`
        })) as InvoiceItem[];
        setBookmarkedItems(presets);
      }
    }
  }, []);

  const saveToLocalStorage = useCallback((
    updatedInvoices: Invoice[],
    actId: string,
    clientsList: ClientInfo[],
    projectsList: ProjectInfo[],
    bookmarksList: InvoiceItem[],
    logsList: HistoryLog[]
  ) => {
    if (typeof window !== "undefined") {
      const data = {
        invoices: updatedInvoices,
        activeInvoiceId: actId,
        savedClients: clientsList,
        savedProjects: projectsList,
        bookmarkedItems: bookmarksList,
        historyLogs: logsList
      };
      localStorage.setItem("termshield_invoice_data", JSON.stringify(data));
    }
  }, []);

  // Sync back state changes to local storage helper
  const updateActiveInvoice = useCallback((updater: (inv: Invoice) => Invoice) => {
    setInvoices(prev => {
      const next = prev.map(inv => inv.id === activeInvoiceId ? updater(inv) : inv);
      saveToLocalStorage(next, activeInvoiceId, savedClients, savedProjects, bookmarkedItems, historyLogs);
      return next;
    });
  }, [activeInvoiceId, savedClients, savedProjects, bookmarkedItems, historyLogs, saveToLocalStorage]);

  // --- TOAST NOTIFICATIONS ---
  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // --- LOG HISTORY ---
  const addLog = useCallback((invoiceId: string, message: string) => {
    const newLog: HistoryLog = {
      id: `log-${Date.now()}`,
      invoiceId,
      timestamp: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      message
    };
    setHistoryLogs(prev => {
      const next = [newLog, ...prev].slice(0, 100); // Keep last 100 logs
      saveToLocalStorage(invoices, activeInvoiceId, savedClients, savedProjects, bookmarkedItems, next);
      return next;
    });
  }, [invoices, activeInvoiceId, savedClients, savedProjects, bookmarkedItems, saveToLocalStorage]);

  // --- ACTIVE INVOICE REFERENCE ---
  const activeInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === activeInvoiceId) || invoices[0];
  }, [invoices, activeInvoiceId]);

  // --- ANALYTICS DASHBOARD STATS ---
  const dashboardStats = useMemo(() => {
    let totalItems = 0;
    let totalHours = 0;
    let frameworksSet = new Set<string>();
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let paidRevenue = 0;

    invoices.forEach(inv => {
      const currencySymbol = inv.currency === "INR" ? "₹" : inv.currency === "USD" ? "$" : inv.currency === "EUR" ? "€" : "£";
      
      // Calculate individual invoice total
      let sub = 0;
      let itemDiscountsTotal = 0;
      inv.items.forEach(item => {
        const cost = item.quantity * item.rate;
        sub += cost;
        const discountAmount = cost * ((item.discount || 0) / 100);
        itemDiscountsTotal += discountAmount;
        
        totalItems += 1;
        if (item.unit.toLowerCase().includes("hour") || item.unit.toLowerCase() === "hr") {
          totalHours += item.quantity;
        }
        item.frameworks.forEach(f => frameworksSet.add(f));
      });

      const afterItemDiscounts = sub - itemDiscountsTotal;
      const overallDiscAmount = afterItemDiscounts * ((inv.overallDiscount || 0) / 100);
      const taxedBase = afterItemDiscounts - overallDiscAmount;
      const taxAmount = taxedBase * ((inv.taxRate || 0) / 100);
      const invoiceTotal = taxedBase + taxAmount;

      totalRevenue += invoiceTotal; // Note: simplified summation across different currencies, showing main aggregate
      
      if (inv.status === "Paid") {
        paidRevenue += invoiceTotal;
      } else {
        pendingRevenue += invoiceTotal;
      }
    });

    return {
      totalItems,
      totalHours: Math.round(totalHours * 10) / 10,
      frameworksCount: frameworksSet.size,
      allFrameworks: Array.from(frameworksSet).slice(0, 8),
      totalRevenue: Math.round(totalRevenue),
      pendingRevenue: Math.round(pendingRevenue),
      paidRevenue: Math.round(paidRevenue)
    };
  }, [invoices]);

  // --- CALCULATIONS FOR CURRENT INVOICE ---
  const calculations = useMemo(() => {
    if (!activeInvoice) return { subtotal: 0, itemDiscounts: 0, invoiceDiscountAmount: 0, taxAmount: 0, total: 0, profit: 0, margin: 0, actualBilled: 0 };

    let subtotal = 0;
    let itemDiscounts = 0;

    activeInvoice.items.forEach(item => {
      const lineCost = item.quantity * item.rate;
      subtotal += lineCost;
      itemDiscounts += lineCost * ((item.discount || 0) / 100);
    });

    const netAfterItemDiscounts = subtotal - itemDiscounts;
    const invoiceDiscountAmount = netAfterItemDiscounts * ((activeInvoice.overallDiscount || 0) / 100);
    const taxableAmount = netAfterItemDiscounts - invoiceDiscountAmount;
    const taxAmount = taxableAmount * ((activeInvoice.taxRate || 0) / 100);
    const total = taxableAmount + taxAmount;

    // Margin Calculations
    const expenses = activeInvoice.expenses || 0;
    const profit = total - expenses;
    const margin = total > 0 ? (profit / total) * 100 : 0;

    return {
      subtotal,
      itemDiscounts,
      invoiceDiscountAmount,
      taxAmount,
      total,
      profit,
      margin: Math.round(margin * 10) / 10,
      actualBilled: total
    };
  }, [activeInvoice]);

  // --- CURRENCY SYMBOL HELPERS ---
  const currencySymbol = useMemo(() => {
    if (!activeInvoice) return "₹";
    switch (activeInvoice.currency) {
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      default: return "₹";
    }
  }, [activeInvoice]);

  // --- TABS & GENERAL INVOICE ACTIONS ---
  const handleAddNewInvoice = () => {
    const nextNum = invoices.length + 1;
    const newInv = INITIAL_INVOICE(nextNum);
    const updated = [...invoices, newInv];
    setInvoices(updated);
    setActiveInvoiceId(newInv.id);
    addToast(`Invoice TS-2026-${String(nextNum).padStart(3, "0")} created!`, "success");
    addLog(newInv.id, "Created new invoice instance");
    saveToLocalStorage(updated, newInv.id, savedClients, savedProjects, bookmarkedItems, historyLogs);
  };

  const handleDuplicateInvoice = () => {
    if (!activeInvoice) return;
    const copyNum = invoices.length + 1;
    const duplicated: Invoice = {
      ...activeInvoice,
      id: `inv-${Date.now()}-${copyNum}`,
      invoiceNumber: `${activeInvoice.invoiceNumber}-COPY`,
      title: `${activeInvoice.title} (Copy)`
    };
    const updated = [...invoices, duplicated];
    setInvoices(updated);
    setActiveInvoiceId(duplicated.id);
    addToast("Invoice duplicated successfully!", "success");
    addLog(duplicated.id, `Duplicated from ${activeInvoice.invoiceNumber}`);
    saveToLocalStorage(updated, duplicated.id, savedClients, savedProjects, bookmarkedItems, historyLogs);
  };

  const handleDeleteInvoice = () => {
    if (invoices.length <= 1) {
      addToast("You must keep at least one active invoice.", "warning");
      return;
    }
    const idx = invoices.findIndex(i => i.id === activeInvoiceId);
    const updated = invoices.filter(i => i.id !== activeInvoiceId);
    const nextActiveId = updated[Math.max(0, idx - 1)].id;
    setInvoices(updated);
    setActiveInvoiceId(nextActiveId);
    addToast("Invoice deleted.", "info");
    saveToLocalStorage(updated, nextActiveId, savedClients, savedProjects, bookmarkedItems, historyLogs);
  };

  // --- LINE ITEMS CONTROL ---
  const handleAddLineItem = (category: string = "labor") => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      category,
      title: "New Service Description",
      description: "Provide details of the deliverables or tasks completed.",
      quantity: 1,
      unit: "hours",
      rate: 1500,
      discount: 0,
      frameworks: [],
      notes: ""
    };
    updateActiveInvoice(inv => ({
      ...inv,
      items: [...inv.items, newItem]
    }));
    addToast("Added new line item.", "success");
    addLog(activeInvoiceId, `Added line item: ${newItem.title}`);
  };

  const handleUpdateLineItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    updateActiveInvoice(inv => ({
      ...inv,
      items: inv.items.map(item => {
        if (item.id === itemId) {
          // Validation: positive quantities/rates/discounts
          if ((field === "quantity" || field === "rate" || field === "discount") && value < 0) {
            addToast(`Warning: negative ${field} was normalized to 0.`, "warning");
            return { ...item, [field]: 0 };
          }
          if (field === "discount" && value > 100) {
            addToast("Warning: discount cannot exceed 100%.", "warning");
            return { ...item, discount: 100 };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleDuplicateLineItem = (itemId: string) => {
    const item = activeInvoice.items.find(i => i.id === itemId);
    if (!item) return;
    const duplicated: InvoiceItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random()}`,
      title: `${item.title} (Copy)`
    };
    updateActiveInvoice(inv => ({
      ...inv,
      items: [...inv.items, duplicated]
    }));
    addToast("Line item duplicated.", "success");
  };

  const handleDeleteLineItem = (itemId: string) => {
    updateActiveInvoice(inv => ({
      ...inv,
      items: inv.items.filter(item => item.id !== itemId)
    }));
    addToast("Line item deleted.", "info");
    addLog(activeInvoiceId, `Deleted line item.`);
  };

  const handleMoveLineItem = (index: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= activeInvoice.items.length) return;
    updateActiveInvoice(inv => {
      const itemsCopy = [...inv.items];
      const temp = itemsCopy[index];
      itemsCopy[index] = itemsCopy[nextIdx];
      itemsCopy[nextIdx] = temp;
      return { ...inv, items: itemsCopy };
    });
  };

  // Add tag chip to specific line item
  const handleAddFrameworkToItem = (itemId: string, tag: string) => {
    if (!tag.trim()) return;
    const cleanTag = tag.trim();
    const item = activeInvoice.items.find(i => i.id === itemId);
    if (!item) return;
    if (item.frameworks.includes(cleanTag)) {
      addToast("Tag already exists on this item.", "info");
      return;
    }
    handleUpdateLineItem(itemId, "frameworks", [...item.frameworks, cleanTag]);
  };

  const handleRemoveFrameworkFromItem = (itemId: string, tag: string) => {
    const item = activeInvoice.items.find(i => i.id === itemId);
    if (!item) return;
    handleUpdateLineItem(itemId, "frameworks", item.frameworks.filter(t => t !== tag));
  };

  // Bookmark an individual line item for reuse
  const handleBookmarkItem = (item: InvoiceItem) => {
    const newItemBookmark: InvoiceItem = {
      ...item,
      id: `bm-${Date.now()}`
    };
    setBookmarkedItems(prev => {
      const next = [...prev, newItemBookmark];
      saveToLocalStorage(invoices, activeInvoiceId, savedClients, savedProjects, next, historyLogs);
      return next;
    });
    addToast("Item added to bookmarks sidebar!", "success");
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    setBookmarkedItems(prev => {
      const next = prev.filter(b => b.id !== bookmarkId);
      saveToLocalStorage(invoices, activeInvoiceId, savedClients, savedProjects, next, historyLogs);
      return next;
    });
    addToast("Bookmark removed.", "info");
  };

  // --- CRM SIDEBAR CONTROL ---
  const handleSelectClient = (client: ClientInfo) => {
    updateActiveInvoice(inv => ({ ...inv, client }));
    addToast(`Selected client: ${client.company}`, "info");
    addLog(activeInvoiceId, `Updated client details: ${client.company}`);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name || !newClientForm.company) {
      addToast("Name and Company fields are required.", "warning");
      return;
    }
    const newClient: ClientInfo = {
      id: `client-${Date.now()}`,
      ...newClientForm
    };
    const nextList = [...savedClients, newClient];
    setSavedClients(nextList);
    updateActiveInvoice(inv => ({ ...inv, client: newClient }));
    setNewClientForm({ name: "", email: "", company: "", taxId: "", address: "" });
    addToast(`Client '${newClient.company}' created and assigned!`, "success");
    saveToLocalStorage(invoices, activeInvoiceId, nextList, savedProjects, bookmarkedItems, historyLogs);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name || !newProjectForm.clientId) {
      addToast("Project name and Client selector are required.", "warning");
      return;
    }
    const newProj: ProjectInfo = {
      id: `proj-${Date.now()}`,
      ...newProjectForm,
      status: "active"
    };
    const nextList = [...savedProjects, newProj];
    setSavedProjects(nextList);
    setNewProjectForm({ name: "", clientId: "", budget: 0 });
    addToast(`Project '${newProj.name}' created!`, "success");
    saveToLocalStorage(invoices, activeInvoiceId, savedClients, nextList, bookmarkedItems, historyLogs);
  };

  const handleLoadTemplate = (type: "web-dev" | "retainer" | "consulting") => {
    let items: InvoiceItem[] = [];
    if (type === "web-dev") {
      items = [
        {
          id: `item-${Date.now()}-1`,
          category: "development",
          title: "Full-Stack MVP Development",
          description: "Building production app router pages, authentication flows, backend APIs, and integrations.",
          quantity: 80,
          unit: "hours",
          rate: 2500,
          discount: 5,
          frameworks: ["React", "Next.js", "Supabase", "TypeScript"],
          notes: "Milestone 1 build"
        },
        {
          id: `item-${Date.now()}-2`,
          category: "design",
          title: "UI/UX Prototype Wireframing",
          description: "High fidelity mobile + web prototypes and asset exporting for developer handoff.",
          quantity: 20,
          unit: "hours",
          rate: 1800,
          discount: 0,
          frameworks: ["Figma"],
          notes: "Approved roadmap design"
        }
      ];
    } else if (type === "retainer") {
      items = [
        {
          id: `item-${Date.now()}-1`,
          category: "consulting",
          title: "Monthly Development Retainer",
          description: "Ad-hoc bug fixes, support SLA responses, cloud hosting monitoring, and monthly features update.",
          quantity: 1,
          unit: "months",
          rate: 75000,
          discount: 0,
          frameworks: ["React", "Next.js", "Vercel"],
          notes: "Billing cycle: June 2026"
        }
      ];
    } else {
      items = [
        {
          id: `item-${Date.now()}-1`,
          category: "consulting",
          title: "Technical Advisory & Architecture Audit",
          description: "Analyzing infrastructure leaks, slow database queries, and drafting migration schedules.",
          quantity: 10,
          unit: "hours",
          rate: 4000,
          discount: 0,
          frameworks: ["System Design", "Node.js", "PostgreSQL"],
          notes: "Logs analysis report attached"
        }
      ];
    }

    updateActiveInvoice(inv => ({
      ...inv,
      items,
      overallDiscount: 0,
      taxRate: 18,
      taxLabel: "GST"
    }));
    addToast("Template loaded. Current items replaced.", "success");
    addLog(activeInvoiceId, `Loaded preset template: ${type}`);
  };

  const handleAddBookmarkToInvoice = (bookmark: InvoiceItem) => {
    const newItem: InvoiceItem = {
      ...bookmark,
      id: `item-${Date.now()}-${Math.random()}`
    };
    updateActiveInvoice(inv => ({
      ...inv,
      items: [...inv.items, newItem]
    }));
    addToast(`Added '${bookmark.title}' from bookmarks!`, "success");
  };

  // --- SHARING & EXPORTS ---
  const handleCopySummary = () => {
    if (!activeInvoice) return;
    const lines = activeInvoice.items.map(i => {
      const amt = i.quantity * i.rate * (1 - (i.discount || 0) / 100);
      return `- ${i.title} (${i.quantity} ${i.unit} @ ${currencySymbol}${i.rate}) = ${currencySymbol}${amt.toLocaleString()}`;
    }).join("\n");

    const summaryText = `INVOICE: ${activeInvoice.invoiceNumber}
Title: ${activeInvoice.title}
Client: ${activeInvoice.client.company} (Contact: ${activeInvoice.client.name})
Issue Date: ${activeInvoice.issueDate}
Due Date: ${activeInvoice.dueDate}

ITEMS:
${lines}

Subtotal: ${currencySymbol}${calculations.subtotal.toLocaleString()}
Tax (${activeInvoice.taxRate}% ${activeInvoice.taxLabel}): ${currencySymbol}${calculations.taxAmount.toLocaleString()}
Discount: ${activeInvoice.overallDiscount}%
GRAND TOTAL DUE: ${currencySymbol}${calculations.total.toLocaleString()}

Payment Terms: ${activeInvoice.paymentTerms}
Created on TermShield Invoice Studio.`;

    navigator.clipboard.writeText(summaryText);
    addToast("Invoice Markdown Summary copied to clipboard!", "success");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeInvoice, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Invoice-${activeInvoice.invoiceNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast("JSON Config downloaded successfully.", "success");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedInvoice = JSON.parse(event.target?.result as string) as Invoice;
        if (!importedInvoice.invoiceNumber || !importedInvoice.items) {
          throw new Error("Invalid invoice structure");
        }
        
        // Ensure new ID to prevent conflicts
        importedInvoice.id = `inv-${Date.now()}`;
        importedInvoice.title = `[Imported] ${importedInvoice.title}`;
        
        const nextList = [...invoices, importedInvoice];
        setInvoices(nextList);
        setActiveInvoiceId(importedInvoice.id);
        addToast("Invoice imported successfully!", "success");
        addLog(importedInvoice.id, "Imported from JSON configuration file");
        saveToLocalStorage(nextList, importedInvoice.id, savedClients, savedProjects, bookmarkedItems, historyLogs);
      } catch (err) {
        addToast("Error parsing file. Make sure it is a valid TermShield Invoice JSON.", "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // clear input
  };

  const handlePrint = () => {
    window.print();
  };

  // --- FILTERED TABS FOR INVOICE HISTORY ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.client.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Handle active project selection for estimated vs actual comparison
  useEffect(() => {
    if (activeInvoice && savedProjects) {
      const activeProj = savedProjects.find(p => p.clientId === activeInvoice.client.id);
      if (activeProj) {
        setSelectedProjectId(activeProj.id);
        updateActiveInvoice(inv => ({ ...inv, estimatedBudget: activeProj.budget }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInvoice?.client?.id]);

  const handleProjectSelectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const proj = savedProjects.find(p => p.id === projectId);
    if (proj) {
      updateActiveInvoice(inv => ({ ...inv, estimatedBudget: proj.budget }));
      addToast(`Compared budget linked: ${currencySymbol}${proj.budget.toLocaleString()}`, "info");
    }
  };

  return (
    <div className="min-h-screen bg-[#101320] text-[#e0e1f5] font-sans pb-16 selection:bg-[#4edea3]/30 selection:text-white relative overflow-hidden">
      
      {/* Dynamic ambient mesh gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0 bg-gradient-to-b from-[#1c1f2d]/40 to-transparent" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-[#4edea3]/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] -right-[10%] w-[40%] h-[50%] rounded-full bg-[#d0bcff]/5 blur-[120px] pointer-events-none z-0" />

      {/* Header Bar */}
      <header className="border-b border-[#3c4a42]/20 bg-[#101320]/80 backdrop-blur-xl sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/20 transition-colors group-hover:bg-[#4edea3]/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#4edea3]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-[#e0e1f5]">
                Term<span className="text-[#4edea3]">Shield</span>
              </span>
            </Link>
            <div className="h-6 w-px bg-[#3c4a42]/30 hidden md:block" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4edea3] bg-[#4edea3]/5 border border-[#4edea3]/15 px-3 py-1 rounded-full hidden md:inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              Invoice Billing Studio
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/settings" className="text-sm text-[#bbcabf] hover:text-white transition">
              Client Scans
            </Link>
            <button
              onClick={handlePrint}
              className="btn-primary rounded-full px-5 py-1.5 text-xs font-bold glow-primary flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none no-print">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-up ${
              toast.type === "success" 
                ? "bg-[#101320]/95 border-[#4edea3]/30 text-white" 
                : toast.type === "warning" 
                ? "bg-[#101320]/95 border-[#ffb4ab]/30 text-[#ffb4ab]" 
                : "bg-[#101320]/95 border-[#d0bcff]/30 text-[#d0bcff]"
            }`}
          >
            {toast.type === "success" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#4edea3]"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {toast.type === "warning" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#ffb4ab]"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            )}
            {toast.type === "info" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#d0bcff]"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">

        {/* Dashboard Quick Summary Widgets */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 no-print">
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#bbcabf] font-medium tracking-wide">TOTAL INVOICES</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-white">{invoices.length}</span>
              <span className="text-xs text-[#bbcabf]/75">active sheets</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#bbcabf] font-medium tracking-wide">TOTAL HOURS</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-white">{dashboardStats.totalHours}</span>
              <span className="text-xs text-[#bbcabf]/75">billable hrs</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#bbcabf] font-medium tracking-wide">TOTAL PIPELINE REVENUE</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[#4edea3]">₹{dashboardStats.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#bbcabf] font-medium tracking-wide">PAID REVENUE</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[#4edea3]/90">₹{dashboardStats.paidRevenue.toLocaleString()}</span>
              <span className="text-[10px] text-[#4edea3] font-semibold bg-[#4edea3]/10 border border-[#4edea3]/20 px-1.5 py-0.5 rounded">Settled</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-xs text-[#bbcabf] font-medium tracking-wide">PENDING BILLING</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[#ffb4ab]">₹{dashboardStats.pendingRevenue.toLocaleString()}</span>
              <span className="text-[10px] text-[#ffb4ab] font-semibold bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 px-1.5 py-0.5 rounded">Unpaid</span>
            </div>
          </div>
        </section>

        {/* Invoice Tabs Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#3c4a42]/15 pb-4 mb-6 no-print">
          {invoices.map(inv => (
            <button
              key={inv.id}
              onClick={() => setActiveInvoiceId(inv.id)}
              className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                inv.id === activeInvoiceId
                  ? "bg-[#4edea3]/10 border-[#4edea3]/40 text-[#4edea3] shadow-md shadow-[#4edea3]/5"
                  : "bg-[#1c1f2d]/50 border-white/[0.04] text-[#bbcabf] hover:bg-[#1c1f2d] hover:border-white/[0.1] hover:text-white"
              }`}
            >
              <span>{inv.invoiceNumber}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{
                backgroundColor: inv.status === "Paid" ? "#4edea3" : inv.status === "Draft" ? "#bbcabf" : inv.status === "Sent" ? "#d0bcff" : "#ffb4ab"
              }} />
              {invoices.length > 1 && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inv.id === activeInvoiceId) {
                      handleDeleteInvoice();
                    } else {
                      const updated = invoices.filter(i => i.id !== inv.id);
                      setInvoices(updated);
                      addToast("Invoice deleted", "info");
                    }
                  }}
                  className="hover:text-red-400 font-bold transition text-[10px] ml-1 p-0.5"
                >
                  ✕
                </span>
              )}
            </button>
          ))}
          <button
            onClick={handleAddNewInvoice}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-dashed border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/10 hover:border-[#4edea3] transition-all ml-auto"
          >
            <span>+ Add Invoice</span>
          </button>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          
          {/* SIDEBAR: CRM CONTROL */}
          <aside className={`no-print space-y-4 transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 overflow-hidden opacity-0 pointer-events-none" : "w-full"}`}>
            
            {/* Collapse Trigger Button (internal) */}
            <div className="flex items-center justify-between bg-[#1c1f2d] border border-[#3c4a42]/20 rounded-xl p-3.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Studio Sidebar</span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="text-[#bbcabf] hover:text-white transition p-1"
                title="Collapse sidebar"
              >
                ◀ Collapsible
              </button>
            </div>

            {/* Navigation tabs inside Sidebar */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#1c1f2d] border border-[#3c4a42]/15">
              {(["items", "client", "project", "settings", "bookmarks", "templates", "history"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSidebarTab(tab)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                    activeSidebarTab === tab
                      ? "bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/20"
                      : "text-[#bbcabf] hover:text-white"
                  }`}
                >
                  {tab.substring(0, 3)}
                </button>
              ))}
            </div>

            {/* Dynamic Sidebar Content Box */}
            <div className="glass-card rounded-2xl border border-[#3c4a42]/15 p-4 space-y-4">
              
              {/* SIDEBAR TAB 1: LINE ITEMS & SEARCH */}
              {activeSidebarTab === "items" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Line Items Center</h3>
                  
                  {/* Category Insert Shortcuts */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider">Quick Add Labor & Cost</span>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.slice(0, 8).map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleAddLineItem(c.id)}
                          className="px-2.5 py-2 text-left text-xs bg-[#1c1f2d] border border-white/[0.04] rounded-xl text-white hover:border-[#4edea3]/40 hover:bg-[#4edea3]/5 transition-all truncate"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="space-y-2 mt-4">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider">Search & Filter Invoices</span>
                    <input
                      type="text"
                      placeholder="Search company, invoice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-sm rounded-xl px-3.5 py-2 focus:border-[#4edea3] focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {["All", "Draft", "Sent", "Paid", "Overdue"].map(st => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider transition ${
                            statusFilter === st
                              ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]"
                              : "bg-[#1c1f2d]/50 border-transparent text-[#bbcabf]"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SIDEBAR TAB 2: CLIENT CRM */}
              {activeSidebarTab === "client" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Saved Clients</h3>
                  
                  {/* Select Saved Clients */}
                  <div className="space-y-2">
                    {savedClients.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          activeInvoice?.client.company === c.company
                            ? "bg-[#4edea3]/5 border-[#4edea3]/40"
                            : "bg-[#1c1f2d] border-transparent hover:border-white/[0.1]"
                        }`}
                      >
                        <p className="text-sm font-bold text-white">{c.company}</p>
                        <p className="text-xs text-[#bbcabf] mt-0.5">{c.name} • {c.email}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add New Client Form */}
                  <form onSubmit={handleCreateClient} className="space-y-3 pt-3 border-t border-[#3c4a42]/15">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Add to CRM Clients</span>
                    <input
                      type="text"
                      placeholder="Company Name *"
                      required
                      value={newClientForm.company}
                      onChange={e => setNewClientForm({...newClientForm, company: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Client Name *"
                      required
                      value={newClientForm.name}
                      onChange={e => setNewClientForm({...newClientForm, name: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Client Email"
                      value={newClientForm.email}
                      onChange={e => setNewClientForm({...newClientForm, email: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Tax ID / GSTIN"
                      value={newClientForm.taxId}
                      onChange={e => setNewClientForm({...newClientForm, taxId: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <textarea
                      placeholder="Billing Address"
                      rows={2}
                      value={newClientForm.address}
                      onChange={e => setNewClientForm({...newClientForm, address: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full btn-primary rounded-xl py-2.5 text-xs font-bold tracking-wider"
                    >
                      Save Client to CRM
                    </button>
                  </form>
                </div>
              )}

              {/* SIDEBAR TAB 3: PROJECT CRM */}
              {activeSidebarTab === "project" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">CRM Projects</h3>
                  
                  {/* Link active project */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Compare Baseline Budget</span>
                    <select
                      value={selectedProjectId}
                      onChange={e => handleProjectSelectChange(e.target.value)}
                      className="w-full bg-[#1c1f2d] border border-[#3c4a42]/30 text-xs text-white rounded-xl px-3.5 py-2.5 focus:border-[#4edea3] focus:outline-none"
                    >
                      <option value="">Select Project to Compare...</option>
                      {savedProjects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Budget: ₹{p.budget.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* List Projects */}
                  <div className="space-y-2.5 pt-2">
                    {savedProjects.map(p => {
                      const clientObj = savedClients.find(c => c.id === p.clientId);
                      return (
                        <div key={p.id} className="p-3 bg-[#1c1f2d] border border-white/[0.04] rounded-xl">
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-[#bbcabf] mt-0.5">Client: {clientObj?.company || "Unknown"}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-semibold text-[#4edea3]">Budget: ₹{p.budget.toLocaleString()}</span>
                            <span className="text-[9px] uppercase tracking-wider text-[#d0bcff] px-2 py-0.5 bg-[#d0bcff]/10 rounded-full border border-[#d0bcff]/15">
                              {p.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Create Project Form */}
                  <form onSubmit={handleCreateProject} className="space-y-3 pt-3 border-t border-[#3c4a42]/15">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">New CRM Project</span>
                    <input
                      type="text"
                      placeholder="Project Name *"
                      required
                      value={newProjectForm.name}
                      onChange={e => setNewProjectForm({...newProjectForm, name: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <select
                      value={newProjectForm.clientId}
                      required
                      onChange={e => setNewProjectForm({...newProjectForm, clientId: e.target.value})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs text-white rounded-xl px-3.5 py-2.5 focus:border-[#4edea3] focus:outline-none"
                    >
                      <option value="">Select Client *</option>
                      {savedClients.map(c => (
                        <option key={c.id} value={c.id}>{c.company}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Project Budget (₹) *"
                      required
                      value={newProjectForm.budget || ""}
                      onChange={e => setNewProjectForm({...newProjectForm, budget: Number(e.target.value)})}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-white focus:border-[#4edea3] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full btn-secondary rounded-xl py-2.5 text-xs font-bold tracking-wider"
                    >
                      Save CRM Project
                    </button>
                  </form>
                </div>
              )}

              {/* SIDEBAR TAB 4: TAX & GENERAL SETTINGS */}
              {activeSidebarTab === "settings" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Global Settings</h3>
                  
                  {/* Currency Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#bbcabf] font-semibold uppercase">Currency Selector</label>
                    <select
                      value={activeInvoice?.currency}
                      onChange={e => updateActiveInvoice(inv => ({ ...inv, currency: e.target.value }))}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:border-[#4edea3] focus:outline-none"
                    >
                      <option value="INR">INR (₹) Indian Rupee</option>
                      <option value="USD">USD ($) US Dollar</option>
                      <option value="EUR">EUR (€) Euro</option>
                      <option value="GBP">GBP (£) British Pound</option>
                    </select>
                  </div>

                  {/* Global Tax Settings */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] text-[#bbcabf] font-semibold uppercase">Tax Configuration</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Label (GST/VAT)"
                        value={activeInvoice?.taxLabel}
                        onChange={e => updateActiveInvoice(inv => ({ ...inv, taxLabel: e.target.value }))}
                        className="bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3 py-2 text-white focus:border-[#4edea3] focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Tax %"
                        value={activeInvoice?.taxRate || ""}
                        onChange={e => updateActiveInvoice(inv => {
                          const rate = Number(e.target.value);
                          if (rate < 0 || rate > 100) return inv;
                          return { ...inv, taxRate: rate };
                        })}
                        className="bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3 py-2 text-white focus:border-[#4edea3] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Global Discount */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] text-[#bbcabf] font-semibold uppercase">Invoice Discount (%)</label>
                    <input
                      type="number"
                      value={activeInvoice?.overallDiscount || ""}
                      onChange={e => updateActiveInvoice(inv => {
                        const disc = Number(e.target.value);
                        if (disc < 0 || disc > 100) return inv;
                        return { ...inv, overallDiscount: disc };
                      })}
                      className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs rounded-xl px-3 py-2 text-white focus:border-[#4edea3] focus:outline-none"
                      placeholder="e.g. 5"
                    />
                  </div>

                  {/* Recurring Invoice Option */}
                  <div className="space-y-2 pt-3 border-t border-[#3c4a42]/15">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#bbcabf] font-semibold uppercase">Recurring Invoice</span>
                      <input
                        type="checkbox"
                        checked={activeInvoice?.recurring.enabled || false}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          recurring: { ...inv.recurring, enabled: e.target.checked }
                        }))}
                        className="rounded border-[#3c4a42]/40 accent-[#4edea3] cursor-pointer"
                      />
                    </div>

                    {activeInvoice?.recurring.enabled && (
                      <div className="space-y-2 pt-2 animate-slide-up">
                        <select
                          value={activeInvoice.recurring.frequency}
                          onChange={e => updateActiveInvoice(inv => ({
                            ...inv,
                            recurring: { ...inv.recurring, frequency: e.target.value as any }
                          }))}
                          className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs text-white rounded-xl px-3 py-2 focus:border-[#4edea3] focus:outline-none"
                        >
                          <option value="Weekly">Weekly Cycle</option>
                          <option value="Monthly">Monthly Cycle</option>
                          <option value="Quarterly">Quarterly Cycle</option>
                        </select>
                        <input
                          type="date"
                          value={activeInvoice.recurring.nextDate}
                          onChange={e => updateActiveInvoice(inv => ({
                            ...inv,
                            recurring: { ...inv.recurring, nextDate: e.target.value }
                          }))}
                          className="w-full bg-[#101320] border border-[#3c4a42]/30 text-xs text-white rounded-xl px-3 py-2 focus:border-[#4edea3] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SIDEBAR TAB 5: BOOKMARKS */}
              {activeSidebarTab === "bookmarks" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Bookmarked Line Items</h3>
                  {bookmarkedItems.length === 0 ? (
                    <p className="text-xs text-[#bbcabf]/60 text-center py-4">No starred items yet. Click the star icon on any line item to save here.</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {bookmarkedItems.map(bm => (
                        <div
                          key={bm.id}
                          className="p-3 bg-[#1c1f2d] border border-white/[0.04] rounded-xl hover:border-[#4edea3]/30 transition group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-[#4edea3]">{bm.category}</span>
                              <button
                                onClick={() => handleDeleteBookmark(bm.id)}
                                className="text-xs text-[#ffb4ab] opacity-0 group-hover:opacity-100 transition"
                                title="Delete Bookmark"
                              >
                                ✕
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-white mt-1">{bm.title}</p>
                            <p className="text-[10px] text-[#bbcabf]/75 mt-0.5 line-clamp-1">{bm.description}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.03]">
                            <span className="text-[10px] text-[#bbcabf] font-bold">{currencySymbol}{bm.rate.toLocaleString()} / {bm.unit}</span>
                            <button
                              onClick={() => handleAddBookmarkToInvoice(bm)}
                              className="px-2 py-0.5 bg-[#4edea3]/10 border border-[#4edea3]/20 rounded text-[9px] font-bold text-[#4edea3] hover:bg-[#4edea3]/20 transition"
                            >
                              + Add to Invoice
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SIDEBAR TAB 6: PRE-FILLED TEMPLATES */}
              {activeSidebarTab === "templates" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Billing Templates</h3>
                  <p className="text-[10px] text-[#bbcabf]">Warning: Loading a template will overwrite current line items.</p>
                  
                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleLoadTemplate("web-dev")}
                      className="w-full text-left p-3.5 bg-[#1c1f2d] border border-white/[0.04] rounded-xl hover:border-[#4edea3]/40 transition group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-[#4edea3]">Full-Stack Web Dev MVP</p>
                      <p className="text-[10px] text-[#bbcabf] mt-0.5">Development (80h) + UI Design (20h)</p>
                    </button>

                    <button
                      onClick={() => handleLoadTemplate("retainer")}
                      className="w-full text-left p-3.5 bg-[#1c1f2d] border border-white/[0.04] rounded-xl hover:border-[#4edea3]/40 transition group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-[#4edea3]">Monthly Agency Retainer</p>
                      <p className="text-[10px] text-[#bbcabf] mt-0.5">Fixed Support SLA + hosting config</p>
                    </button>

                    <button
                      onClick={() => handleLoadTemplate("consulting")}
                      className="w-full text-left p-3.5 bg-[#1c1f2d] border border-white/[0.04] rounded-xl hover:border-[#4edea3]/40 transition group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-[#4edea3]">Advisory & System Audit</p>
                      <p className="text-[10px] text-[#bbcabf] mt-0.5">System audit hours (10h @ ₹4,000)</p>
                    </button>
                  </div>
                </div>
              )}

              {/* SIDEBAR TAB 7: INVOICE LOG HISTORY */}
              {activeSidebarTab === "history" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#3c4a42]/20 pb-2">Studio Logs</h3>
                  {historyLogs.length === 0 ? (
                    <p className="text-xs text-[#bbcabf]/60 text-center py-4">No events logged yet. Edit sheets to track modifications.</p>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {historyLogs.map(log => (
                        <div key={log.id} className="text-[10px] border-b border-[#3c4a42]/10 pb-2">
                          <p className="text-[#bbcabf] font-semibold">{log.message}</p>
                          <p className="text-[#bbcabf]/60 mt-0.5">{log.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>

          {/* MAIN INVOICE WORKSPACE */}
          <main className="space-y-6">

            {/* Sidebar toggle button when collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1f2d] border border-[#3c4a42]/20 rounded-xl text-xs font-semibold text-[#4edea3] hover:bg-[#4edea3]/10 transition-all"
              >
                ▶ Expand Studio Sidebar
              </button>
            )}

            {/* Config & Import/Export Panel */}
            <section className="no-print glass-card rounded-2xl border border-[#3c4a42]/15 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDuplicateInvoice}
                  className="px-4 py-2 bg-[#1c1f2d] border border-white/[0.04] rounded-full text-xs font-bold hover:text-[#4edea3] hover:border-[#4edea3]/20 transition"
                >
                  Duplicate Tab
                </button>
                <button
                  onClick={handleDeleteInvoice}
                  className="px-4 py-2 bg-[#1c1f2d] border border-white/[0.04] rounded-full text-xs font-bold hover:text-red-400 hover:border-red-400/20 transition"
                >
                  Delete Invoice
                </button>
                <button
                  onClick={handleCopySummary}
                  className="px-4 py-2 bg-[#1c1f2d] border border-white/[0.04] rounded-full text-xs font-bold hover:text-[#d0bcff] hover:border-[#d0bcff]/20 transition"
                >
                  Copy Summary Markdown
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2 bg-[#1c1f2d] border border-white/[0.04] rounded-full text-xs font-bold hover:text-white hover:border-white/20 transition flex items-center gap-1"
                >
                  📥 Export JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#1c1f2d] border border-white/[0.04] rounded-full text-xs font-bold hover:text-white hover:border-white/20 transition flex items-center gap-1"
                >
                  📤 Import JSON
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </div>
            </section>

            {/* INVOICE SHEET DESIGN */}
            {activeInvoice ? (
              <section className="glass-card rounded-3xl border border-[#3c4a42]/15 p-6 lg:p-8 space-y-8 print:bg-white print:border-none print:shadow-none print:text-black">
                
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#3c4a42]/15">
                  <div className="space-y-4">
                    {/* Invoice title input */}
                    <input
                      type="text"
                      value={activeInvoice.title}
                      onChange={e => updateActiveInvoice(inv => ({ ...inv, title: e.target.value }))}
                      className="w-full bg-transparent border-b border-transparent hover:border-white/[0.1] focus:border-[#4edea3] text-2xl font-bold text-white focus:outline-none py-1 print:text-black"
                      placeholder="Invoice Title"
                    />

                    {/* Invoice code & Status */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#bbcabf] font-semibold">Invoice No:</span>
                        <input
                          type="text"
                          value={activeInvoice.invoiceNumber}
                          onChange={e => updateActiveInvoice(inv => ({ ...inv, invoiceNumber: e.target.value }))}
                          className="bg-[#1c1f2d]/50 border border-[#3c4a42]/30 text-xs font-bold rounded-lg px-2.5 py-1 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent print:border-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 no-print">
                        <span className="text-xs text-[#bbcabf] font-semibold">Status:</span>
                        <select
                          value={activeInvoice.status}
                          onChange={e => {
                            const val = e.target.value as Invoice["status"];
                            updateActiveInvoice(inv => ({ ...inv, status: val }));
                            addToast(`Status updated to ${val}`, "info");
                            addLog(activeInvoiceId, `Changed status to ${val}`);
                          }}
                          className={`text-xs font-bold rounded-lg border px-2 py-0.5 outline-none bg-[#101320] ${
                            activeInvoice.status === "Paid" 
                              ? "text-[#4edea3] border-[#4edea3]/30" 
                              : activeInvoice.status === "Draft" 
                              ? "text-[#bbcabf] border-white/10" 
                              : activeInvoice.status === "Sent" 
                              ? "text-[#d0bcff] border-[#d0bcff]/30" 
                              : "text-[#ffb4ab] border-[#ffb4ab]/30"
                          }`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>

                      {/* Display status in print mode */}
                      <span className="hidden print:inline-block text-xs font-bold uppercase">
                        • Status: {activeInvoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Dates & Currency Box */}
                  <div className="grid grid-cols-2 gap-4 md:justify-items-end">
                    <div className="space-y-1.5 md:text-right">
                      <label className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Issue Date</label>
                      <input
                        type="date"
                        value={activeInvoice.issueDate}
                        onChange={e => updateActiveInvoice(inv => ({ ...inv, issueDate: e.target.value }))}
                        className="bg-[#1c1f2d]/50 border border-[#3c4a42]/30 text-xs rounded-xl px-3 py-2 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent print:border-none"
                      />
                    </div>
                    <div className="space-y-1.5 md:text-right">
                      <label className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Due Date</label>
                      <input
                        type="date"
                        value={activeInvoice.dueDate}
                        onChange={e => updateActiveInvoice(inv => ({ ...inv, dueDate: e.target.value }))}
                        className="bg-[#1c1f2d]/50 border border-[#3c4a42]/30 text-xs rounded-xl px-3 py-2 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent print:border-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Freelancer & Client details section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-b border-[#3c4a42]/10">
                  
                  {/* Freelancer Details Panel */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-[#4edea3] uppercase font-bold tracking-wider block">Sender / Freelancer</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Freelancer Full Name"
                        value={activeInvoice.freelancer.name}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          freelancer: { ...inv.freelancer, name: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-sm font-semibold text-white focus:outline-none print:text-black"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={activeInvoice.freelancer.email}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          freelancer: { ...inv.freelancer, email: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <input
                        type="text"
                        placeholder="Company / Agency"
                        value={activeInvoice.freelancer.company}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          freelancer: { ...inv.freelancer, company: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <input
                        type="text"
                        placeholder="Tax ID / GSTIN"
                        value={activeInvoice.freelancer.taxId}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          freelancer: { ...inv.freelancer, taxId: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <textarea
                        placeholder="Address"
                        rows={2}
                        value={activeInvoice.freelancer.address}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          freelancer: { ...inv.freelancer, address: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                    </div>
                  </div>

                  {/* Client Details Panel */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-[#d0bcff] uppercase font-bold tracking-wider block">Recipient / Client</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Client Company Name"
                        value={activeInvoice.client.company}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          client: { ...inv.client, company: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-sm font-semibold text-white focus:outline-none print:text-black"
                      />
                      <input
                        type="text"
                        placeholder="Contact Person Full Name"
                        value={activeInvoice.client.name}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          client: { ...inv.client, name: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={activeInvoice.client.email}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          client: { ...inv.client, email: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <input
                        type="text"
                        placeholder="Client Tax ID / GSTIN"
                        value={activeInvoice.client.taxId}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          client: { ...inv.client, taxId: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                      <textarea
                        placeholder="Billing Address"
                        rows={2}
                        value={activeInvoice.client.address}
                        onChange={e => updateActiveInvoice(inv => ({
                          ...inv,
                          client: { ...inv.client, address: e.target.value }
                        }))}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-[#4edea3] text-xs text-[#bbcabf] focus:outline-none print:text-black"
                      />
                    </div>
                  </div>

                </div>

                {/* LINE ITEMS LIST */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider">Line Items breakdown</span>
                    <button
                      onClick={() => handleAddLineItem("labor")}
                      className="no-print px-3 py-1 bg-[#4edea3]/10 border border-[#4edea3]/20 rounded-lg text-xs font-bold text-[#4edea3] hover:bg-[#4edea3]/20 transition"
                    >
                      + Add Item
                    </button>
                  </div>

                  {activeInvoice.items.length === 0 ? (
                    <div className="p-8 text-center bg-[#1c1f2d]/50 border border-dashed border-[#3c4a42]/20 rounded-2xl">
                      <p className="text-sm text-[#bbcabf]">No line items added yet.</p>
                      <button
                        onClick={() => handleAddLineItem("labor")}
                        className="mt-3 px-4 py-1.5 bg-[#4edea3] text-[#003824] rounded-full text-xs font-bold hover:opacity-90 transition"
                      >
                        Create First Item
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeInvoice.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 bg-[#1c1f2d]/70 border border-white/[0.04] rounded-2xl hover:border-white/[0.08] transition-all print:bg-white print:border-slate-200"
                        >
                          {/* Row 1: Category & Title & Actions */}
                          <div className="grid grid-cols-1 md:grid-cols-[110px_1fr_auto] gap-3 items-center">
                            
                            {/* Category Select */}
                            <select
                              value={item.category}
                              onChange={e => handleUpdateLineItem(item.id, "category", e.target.value)}
                              className="bg-[#101320] border border-[#3c4a42]/30 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent print:border-none"
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                              ))}
                            </select>

                            {/* Title input */}
                            <input
                              type="text"
                              value={item.title}
                              onChange={e => handleUpdateLineItem(item.id, "title", e.target.value)}
                              placeholder="Title of deliverable/service"
                              className="bg-[#101320]/30 hover:bg-[#101320]/65 focus:bg-[#101320]/80 border border-transparent focus:border-[#4edea3]/40 text-sm font-semibold rounded-lg px-3 py-1.5 text-white focus:outline-none print:text-black print:border-none"
                            />

                            {/* Item Actions */}
                            <div className="no-print flex items-center gap-1">
                              <button
                                onClick={() => handleMoveLineItem(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-[#bbcabf] hover:text-white disabled:opacity-20"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveLineItem(idx, "down")}
                                disabled={idx === activeInvoice.items.length - 1}
                                className="p-1 text-[#bbcabf] hover:text-white disabled:opacity-20"
                                title="Move Down"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => handleBookmarkItem(item)}
                                className="p-1 text-yellow-400/80 hover:text-yellow-400"
                                title="Bookmark item details"
                              >
                                ★
                              </button>
                              <button
                                onClick={() => handleDuplicateLineItem(item.id)}
                                className="p-1 text-[#d0bcff] hover:text-white"
                                title="Duplicate row"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleDeleteLineItem(item.id)}
                                className="p-1 text-[#ffb4ab] hover:text-red-400"
                                title="Delete row"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Quantities, Rates, Item discount */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-[80px_90px_110px_90px_1fr] gap-4 mt-3 pt-3 border-t border-white/[0.03] print:border-slate-100">
                            
                            {/* Quantity */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Qty</label>
                              <input
                                type="number"
                                value={item.quantity || ""}
                                onChange={e => handleUpdateLineItem(item.id, "quantity", Number(e.target.value))}
                                className="w-full bg-[#101320] border border-[#3c4a42]/20 text-xs rounded-lg px-2 py-1 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent"
                              />
                            </div>

                            {/* Unit */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Unit</label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => handleUpdateLineItem(item.id, "unit", e.target.value)}
                                placeholder="hours"
                                className="w-full bg-[#101320] border border-[#3c4a42]/20 text-xs rounded-lg px-2 py-1 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent"
                              />
                            </div>

                            {/* Rate */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Rate ({currencySymbol})</label>
                              <input
                                type="number"
                                value={item.rate || ""}
                                onChange={e => handleUpdateLineItem(item.id, "rate", Number(e.target.value))}
                                className="w-full bg-[#101320] border border-[#3c4a42]/20 text-xs rounded-lg px-2 py-1 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent"
                              />
                            </div>

                            {/* Item Discount */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Discount %</label>
                              <input
                                type="number"
                                value={item.discount || ""}
                                onChange={e => handleUpdateLineItem(item.id, "discount", Number(e.target.value))}
                                placeholder="0%"
                                className="w-full bg-[#101320] border border-[#3c4a42]/20 text-xs rounded-lg px-2 py-1 text-white focus:border-[#4edea3] focus:outline-none print:text-black print:bg-transparent"
                              />
                            </div>

                            {/* Line Subtotal Display */}
                            <div className="space-y-1 text-right self-end pb-1 pr-1">
                              <span className="text-[10px] uppercase font-bold text-[#bbcabf] block">Line total</span>
                              <span className="text-sm font-bold text-white print:text-black">
                                {currencySymbol}
                                {(
                                  item.quantity * 
                                  item.rate * 
                                  (1 - (item.discount || 0) / 100)
                                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Description & Tag chips */}
                          <div className="mt-3 space-y-2">
                            <textarea
                              rows={1}
                              value={item.description}
                              onChange={e => handleUpdateLineItem(item.id, "description", e.target.value)}
                              placeholder="Add brief deliverable description..."
                              className="w-full bg-transparent border-b border-transparent hover:border-white/[0.05] focus:border-[#4edea3]/30 text-xs text-[#bbcabf] focus:outline-none py-0.5 print:text-black print:border-none"
                            />

                            {/* Frameworks tags UI */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[8px] uppercase tracking-wider font-bold text-[#bbcabf]/75">Frameworks:</span>
                              
                              {/* Existing Tags */}
                              {item.frameworks.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 text-[9px] font-semibold bg-[#4edea3]/5 text-[#4edea3] border border-[#4edea3]/20 px-2 py-0.5 rounded-full"
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveFrameworkFromItem(item.id, tag)}
                                    className="no-print hover:text-red-400 font-bold transition-all text-[8px]"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}

                              {/* Preset quick adding button */}
                              <div className="no-print relative inline-flex items-center gap-1">
                                <select
                                  onChange={e => {
                                    handleAddFrameworkToItem(item.id, e.target.value);
                                    e.target.value = "";
                                  }}
                                  className="bg-[#101320] border border-[#3c4a42]/30 text-[9px] text-[#bbcabf] rounded px-1.5 py-0.5 focus:outline-none"
                                >
                                  <option value="">+ Tag</option>
                                  {FRAMEWORK_PRESETS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BOTTOM SUMMARY & EXTRA CRM DATA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#3c4a42]/15">
                  
                  {/* Left Column: Notes, Terms & Margin Gauge */}
                  <div className="space-y-5">
                    
                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Invoice Notes</label>
                      <textarea
                        rows={3}
                        value={activeInvoice.notes}
                        onChange={e => updateActiveInvoice(inv => ({ ...inv, notes: e.target.value }))}
                        className="w-full bg-[#1c1f2d] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-[#e0e1f5] focus:border-[#4edea3] focus:outline-none print:bg-transparent print:border-none print:text-black"
                        placeholder="Add generic notes here..."
                      />
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Payment Terms & Instructions</label>
                      <textarea
                        rows={2}
                        value={activeInvoice.paymentTerms}
                        onChange={e => updateActiveInvoice(inv => ({ ...inv, paymentTerms: e.target.value }))}
                        className="w-full bg-[#1c1f2d] border border-[#3c4a42]/30 text-xs rounded-xl px-3.5 py-2.5 text-[#e0e1f5] focus:border-[#4edea3] focus:outline-none print:bg-transparent print:border-none print:text-black"
                        placeholder="Bank account, routing code..."
                      />
                    </div>

                    {/* CRM margin and expenses calculators */}
                    <div className="no-print border border-[#3c4a42]/20 rounded-2xl p-4 bg-[#1c1f2d]/40 space-y-4">
                      <span className="text-[10px] text-[#4edea3] uppercase font-bold tracking-wider block">CRM Margin Analytics</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Expenses / COGS ({currencySymbol})</label>
                          <input
                            type="number"
                            value={activeInvoice.expenses || ""}
                            onChange={e => updateActiveInvoice(inv => ({ ...inv, expenses: Number(e.target.value) }))}
                            placeholder="e.g. 5000"
                            className="w-full bg-[#101320] border border-[#3c4a42]/20 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-[#bbcabf]">Net Profit / Margin</label>
                          <p className="text-sm font-bold text-white mt-1">
                            {currencySymbol}{calculations.profit.toLocaleString()} 
                            <span className="text-xs text-[#4edea3] ml-1.5">({calculations.margin}%)</span>
                          </p>
                        </div>
                      </div>

                      {/* Estimated vs Actual View */}
                      {activeInvoice.estimatedBudget > 0 && (
                        <div className="pt-2 border-t border-[#3c4a42]/10 space-y-1">
                          <div className="flex justify-between text-[10px] text-[#bbcabf]">
                            <span>ESTIMATED PROJECT BUDGET: {currencySymbol}{activeInvoice.estimatedBudget.toLocaleString()}</span>
                            <span className={calculations.total > activeInvoice.estimatedBudget ? "text-[#ffb4ab]" : "text-[#4edea3]"}>
                              ACTUAL BILLED: {Math.round((calculations.total / activeInvoice.estimatedBudget) * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[#101320] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                calculations.total > activeInvoice.estimatedBudget ? "bg-[#ffb4ab]" : "bg-[#4edea3]"
                              }`}
                              style={{ width: `${Math.min((calculations.total / activeInvoice.estimatedBudget) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right Column: Invoice Totals Breakdown */}
                  <div className="bg-[#1c1f2d]/40 rounded-2xl p-6 border border-[#3c4a42]/15 space-y-4 print:bg-transparent print:border-none">
                    <span className="text-[10px] text-[#bbcabf] uppercase font-bold tracking-wider block">Invoice Totals</span>
                    
                    <div className="space-y-3.5 text-sm">
                      {/* Subtotal */}
                      <div className="flex justify-between text-[#bbcabf]">
                        <span>Subtotal:</span>
                        <span className="text-white print:text-black font-semibold">
                          {currencySymbol}{calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Item Discounts */}
                      {calculations.itemDiscounts > 0 && (
                        <div className="flex justify-between text-[#ffb4ab]/95">
                          <span>Item Discounts:</span>
                          <span>
                            -{currencySymbol}{calculations.itemDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Invoice overall discount */}
                      {activeInvoice.overallDiscount > 0 && (
                        <div className="flex justify-between text-[#ffb4ab]/95">
                          <span>Overall Discount ({activeInvoice.overallDiscount}%):</span>
                          <span>
                            -{currencySymbol}{calculations.invoiceDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Tax */}
                      {activeInvoice.taxRate > 0 && (
                        <div className="flex justify-between text-[#bbcabf]">
                          <span>{activeInvoice.taxLabel} ({activeInvoice.taxRate}%):</span>
                          <span className="text-white print:text-black font-semibold">
                            {currencySymbol}{calculations.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="h-px bg-[#3c4a42]/15" />

                      {/* GRAND TOTAL DUE */}
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-base font-bold text-white print:text-black">GRAND TOTAL DUE:</span>
                        <span className="text-3xl font-extrabold text-[#4edea3] print:text-black drop-shadow-[0_0_15px_rgba(78,222,163,0.15)]">
                          {currencySymbol}{calculations.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </section>
            ) : null}

          </main>

        </div>

      </div>
    </div>
  );
}
