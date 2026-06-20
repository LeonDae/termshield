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
      confidence: 0.91,
      riskType: "ip",
      evidenceSnippet: "including pre-existing templates and tools",
      impact: "You could lose ownership of tools and templates you've built over years and use across clients.",
      suggestedRewrite: "IP created specifically for this project transfers to the client. Pre-existing tools, templates, and methodologies remain the property of the freelancer.",
      detectionMethod: "rule",
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
      confidence: 0.84,
      riskType: "payment",
      evidenceSnippet: "within ninety days of receipt and may be withheld until final internal approval",
      impact: "You may wait 2-4 months for payment, forcing you to fund the project yourself.",
      suggestedRewrite: "Payment shall be made within 15 business days of invoice receipt.",
      detectionMethod: "rule",
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
      confidence: 0.88,
      riskType: "non-compete",
      evidenceSnippet: "shall not provide similar services to any competing business in India for twelve months",
      impact: "You could be legally barred from taking on new clients in your field for up to 12 months after this project ends.",
      suggestedRewrite: "Remove the non-compete clause entirely, or limit it to a non-solicitation of the client's specific customers for 6 months maximum.",
      detectionMethod: "rule",
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
      confidence: 0.90,
      riskType: "termination",
      evidenceSnippet: "Either party may terminate the agreement with fourteen days written notice",
      impact: "No negative impact — this clause is fair and standard.",
      suggestedRewrite: "No change needed — this clause is within acceptable standards.",
      detectionMethod: "rule",
    },
    {
      id: "risk-liability",
      category: "liability",
      severity: "critical",
      clauseText:
        "The contractor shall bear unlimited liability for any damages, losses, or costs arising from the services provided under this agreement.",
      explanation:
        "Unlimited liability exposes you to claims far exceeding the project value. A liability cap is essential for freelancers.",
      fixMessage:
        "The freelancer's total liability shall not exceed the total fees paid under this agreement.",
      confidence: 0.93,
      riskType: "liability",
      evidenceSnippet: "unlimited liability for any damages, losses, or costs",
      impact: "You could face legal claims for an unlimited amount, potentially bankrupting your freelance business.",
      suggestedRewrite: "The freelancer's total liability shall not exceed the total fees paid under this agreement.",
      detectionMethod: "rule",
    },
    {
      id: "risk-indemnity",
      category: "indemnity",
      severity: "important",
      clauseText:
        "The contractor agrees to indemnify and hold harmless the client against all claims, losses, and expenses arising from the contractor's services.",
      explanation:
        "One-sided indemnification clause makes you solely responsible for all claims, even those arising from the client's actions or decisions.",
      fixMessage:
        "Indemnification should be mutual. Each party indemnifies the other only for claims arising from their own negligence or breach.",
      confidence: 0.87,
      riskType: "indemnity",
      evidenceSnippet: "indemnify and hold harmless the client against all claims, losses, and expenses",
      impact: "You could be forced to pay for legal claims and damages that are not your fault.",
      suggestedRewrite: "Indemnification should be mutual. Each party indemnifies the other only for claims arising from their own negligence or breach.",
      detectionMethod: "hybrid",
    },
    {
      id: "risk-confidentiality",
      category: "confidentiality",
      severity: "safe",
      clauseText:
        "Confidential information shared during this engagement shall remain confidential for a period of 2 years after termination of this agreement.",
      explanation:
        "Standard confidentiality clause with a reasonable and defined duration of 2 years.",
      fixMessage:
        "No change needed — this is a standard and protective clause.",
      confidence: 0.90,
      riskType: "confidentiality",
      evidenceSnippet: "shall remain confidential for a period of 2 years after termination",
      impact: "No negative impact — this is a balanced confidentiality obligation.",
      suggestedRewrite: "No change needed — this clause is within acceptable standards.",
      detectionMethod: "rule",
    },
    {
      id: "risk-revisions",
      category: "revisions",
      severity: "critical",
      clauseText:
        "The client is entitled to unlimited revisions at no additional charge until full satisfaction is achieved.",
      explanation:
        "Unlimited free revisions allow the client to request infinite changes without additional compensation, leading to scope creep.",
      fixMessage:
        "The project includes up to 2 rounds of revisions. Additional revisions shall be billed at the freelancer's standard hourly rate.",
      confidence: 0.92,
      riskType: "revisions",
      evidenceSnippet: "unlimited revisions at no additional charge",
      impact: "The client can demand endless changes, effectively reducing your per-hour rate to near zero.",
      suggestedRewrite: "The project includes up to 2 rounds of revisions. Additional revisions shall be billed at the freelancer's standard hourly rate.",
      detectionMethod: "rule",
    },
    {
      id: "risk-acceptance",
      category: "acceptance",
      severity: "important",
      clauseText:
        "Deliverables shall be accepted or rejected at the sole discretion of the client's project manager.",
      explanation:
        "Acceptance at the client's sole discretion means there are no objective criteria for your work to be considered complete.",
      fixMessage:
        "Acceptance criteria shall be defined in writing before work begins. Work shall be deemed accepted if no written objection is raised within 7 business days.",
      confidence: 0.85,
      riskType: "acceptance",
      evidenceSnippet: "sole discretion of the client's project manager",
      impact: "The client can reject completed work indefinitely with no objective standard, potentially withholding payment.",
      suggestedRewrite: "Acceptance criteria shall be defined in writing before work begins. Work shall be deemed accepted if no written objection is raised within 7 business days of delivery.",
      detectionMethod: "hybrid",
    },
    {
      id: "risk-auto-renewal",
      category: "auto-renewal",
      severity: "important",
      clauseText:
        "This agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least 60 days prior to expiration.",
      explanation:
        "Auto-renewal means the contract extends automatically unless you explicitly opt out, which can trap you in unfavorable terms.",
      fixMessage:
        "This agreement shall not auto-renew. Any extension requires mutual written consent from both parties.",
      confidence: 0.84,
      riskType: "auto-renewal",
      evidenceSnippet: "automatically renew for successive one-year terms",
      impact: "If you miss the opt-out window, you may be bound by the contract for another year at potentially unfavorable rates.",
      suggestedRewrite: "This agreement shall not auto-renew. Any extension requires mutual written consent from both parties.",
      detectionMethod: "rule",
    },
  ],
};
