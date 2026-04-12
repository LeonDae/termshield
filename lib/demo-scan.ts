import type { Scan } from "@/types";

export const demoScan: Scan = {
  id: "demo",
  filename: "freelance-master-services-agreement.pdf",
  status: "complete",
  confidenceScore: 86,
  planType: "premium",
  risks: [
    {
      id: "risk-ip",
      category: "ip",
      severity: "critical",
      clauseText:
        "All intellectual property created during the engagement shall belong exclusively to the client, including pre-existing templates and tools.",
      explanation:
        "The clause appears to transfer ownership of your pre-existing work product, not just what is created specifically for this client.",
      fixMessage:
        "Please revise this clause so pre-existing materials and reusable frameworks remain with the freelancer.",
      confidence: 91,
    },
    {
      id: "risk-payment",
      category: "payment",
      severity: "important",
      clauseText:
        "Invoices will be paid within ninety days of receipt and may be withheld until final internal approval.",
      explanation:
        "A 90-day payment term creates cash flow risk and gives the client broad discretion to delay payment further.",
      fixMessage:
        "Please update the payment terms to net 15 or net 30 with objective acceptance criteria.",
      confidence: 84,
    },
    {
      id: "risk-non-compete",
      category: "non-compete",
      severity: "critical",
      clauseText:
        "The contractor shall not provide similar services to any competing business in India for twelve months after termination.",
      explanation:
        "This clause is unusually broad in geography and duration for a freelance services contract.",
      fixMessage:
        "Please narrow this to confidential information protection rather than a blanket post-contract non-compete.",
      confidence: 88,
    },
    {
      id: "risk-termination",
      category: "termination",
      severity: "safe",
      clauseText:
        "Either party may terminate the agreement with fourteen days written notice.",
      explanation:
        "This is a balanced exit clause and is relatively standard for independent contractor agreements.",
      fixMessage:
        "No change needed for this clause.",
      confidence: 80,
    },
  ],
};
