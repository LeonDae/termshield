/**
 * Rule Engine — Deterministic regex + keyword pattern matching for contract risk detection.
 *
 * Runs BEFORE any LLM call. Handles clear-cut cases with zero API cost.
 * Each rule carries a base severity, confidence score, and explanation template.
 * Indian freelance-specific patterns get boosted priority.
 */

import type { SegmentedClause } from "@/lib/clause-segmenter";
import type { RiskCategory } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────
export interface RuleMatch {
  riskType: RiskCategory;
  severity: "critical" | "important" | "safe";
  confidence: number;
  evidenceSnippet: string;
  explanation: string;
  suggestedRewrite: string;
  impact: string;
  detectionMethod: "rule";
  matchedPattern: string;
}

interface RuleDefinition {
  riskType: RiskCategory;
  pattern: RegExp;
  severity: "critical" | "important" | "safe";
  baseConfidence: number;
  explanation: string;
  suggestedRewrite: string;
  impact: string;
  patternName: string;
}

// ── Safe Clause Patterns ─────────────────────────────────────────────────────
// Clauses matching these are marked safe immediately and skip all downstream processing.

const SAFE_PATTERNS: Array<{
  pattern: RegExp;
  riskType: RiskCategory;
  explanation: string;
}> = [
  {
    pattern: /either\s+party\s+may\s+terminate\s+(?:this\s+)?(?:agreement|contract)\s+(?:with|by\s+giving)\s+\d+\s+days?\s+(?:written\s+)?notice/i,
    riskType: "termination",
    explanation: "Standard mutual termination clause with reasonable notice period.",
  },
  {
    pattern: /(?:net\s+(?:15|30)|within\s+(?:fifteen|thirty|14|15|30)\s+days)/i,
    riskType: "payment",
    explanation: "Standard payment terms within industry-accepted timeframes.",
  },
  {
    pattern: /(?:intellectual\s+property|IP).*(?:created|developed)\s+(?:specifically|exclusively)\s+(?:for|under)\s+(?:this|the)\s+(?:agreement|contract|project).*(?:shall|will)\s+(?:belong|vest|be\s+owned)/i,
    riskType: "ip",
    explanation: "IP clause correctly scoped to work created specifically for this engagement.",
  },
  {
    pattern: /confidential\s+information.*(?:shall|will)\s+(?:remain|be\s+kept)\s+confidential\s+for\s+(?:a\s+period\s+of\s+)?\d+\s+(?:year|month)/i,
    riskType: "confidentiality",
    explanation: "Standard confidentiality clause with a defined and reasonable duration.",
  },
  {
    pattern: /(?:either\s+party|both\s+parties)\s+(?:shall|will)\s+(?:indemnify|hold\s+harmless)\s+(?:the\s+other|each\s+other)/i,
    riskType: "indemnity",
    explanation: "Mutual indemnification clause — balanced and fair to both parties.",
  },
];

// ── Risk Detection Rules ─────────────────────────────────────────────────────
// Ordered by category. Each rule has a regex pattern, severity, and explanation.

const RISK_RULES: RuleDefinition[] = [
  // ────── PAYMENT ──────
  {
    riskType: "payment",
    pattern: /(?:net\s+(?:60|90|120)|within\s+(?:sixty|ninety|90|120)\s+days)/i,
    severity: "critical",
    baseConfidence: 0.92,
    explanation: "Payment terms exceed 45 days, creating severe cash flow risk for freelancers. Industry standard is Net 15-30.",
    suggestedRewrite: "Payment shall be made within 15 business days of invoice receipt.",
    impact: "You may wait 2-4 months for payment, forcing you to fund the project yourself.",
    patternName: "long-payment-terms",
  },
  {
    riskType: "payment",
    pattern: /payment.*(?:withheld|delayed|deferred|held\s+back).*(?:until|pending|subject\s+to)\s+(?:final|internal|management)\s+(?:approval|review|sign-off)/i,
    severity: "critical",
    baseConfidence: 0.90,
    explanation: "Payment is contingent on subjective internal approval, giving the client unilateral power to delay payment indefinitely.",
    suggestedRewrite: "Payment shall not be contingent on internal approval processes. Invoices are deemed accepted if not disputed within 7 business days.",
    impact: "The client can delay payment indefinitely by withholding 'approval' without objective criteria.",
    patternName: "payment-withheld-approval",
  },
  {
    riskType: "payment",
    pattern: /no\s+(?:advance|upfront|milestone)\s+payment/i,
    severity: "important",
    baseConfidence: 0.85,
    explanation: "No advance or milestone payment structure exposes the freelancer to complete non-payment risk.",
    suggestedRewrite: "A 30% advance payment is due upon signing, with milestone payments at agreed project checkpoints.",
    impact: "You bear 100% of the project financial risk with no guarantee of any payment.",
    patternName: "no-advance-payment",
  },
  {
    riskType: "payment",
    pattern: /(?:penalty|deduction|set-off).*(?:late\s+delivery|missed\s+deadline)/i,
    severity: "important",
    baseConfidence: 0.82,
    explanation: "Penalty clauses for late delivery can be used to reduce or withhold payment even for minor delays.",
    suggestedRewrite: "Any penalties for late delivery should be capped at 5% of the project value and require written notice of the delay.",
    impact: "Financial penalties could significantly reduce your earnings for minor timeline issues.",
    patternName: "late-delivery-penalty",
  },

  // ────── IP ──────
  {
    riskType: "ip",
    pattern: /(?:all|any)\s+(?:intellectual\s+property|IP|work\s+product|materials?).*(?:shall|will)\s+(?:belong|vest|be\s+(?:owned|assigned|transferred))\s+(?:exclusively\s+)?(?:to|in|by)\s+(?:the\s+)?(?:client|company|employer)/i,
    severity: "critical",
    baseConfidence: 0.93,
    explanation: "This clause transfers ALL intellectual property to the client, potentially including your pre-existing tools, templates, and frameworks.",
    suggestedRewrite: "IP created specifically for this project transfers to the client. Pre-existing tools, templates, and methodologies remain the property of the freelancer.",
    impact: "You could lose ownership of tools and templates you've built over years and use across clients.",
    patternName: "blanket-ip-transfer",
  },
  {
    riskType: "ip",
    pattern: /work\s+(?:made\s+)?for\s+hire/i,
    severity: "critical",
    baseConfidence: 0.88,
    explanation: "Work-for-hire designation means you have no copyright or moral rights to any work created during this engagement.",
    suggestedRewrite: "Work-for-hire applies only to deliverables specified in the project scope, not to general methods, processes, or pre-existing materials.",
    impact: "Under work-for-hire, you cannot reuse any code, design, or content created during this project.",
    patternName: "work-for-hire",
  },
  {
    riskType: "ip",
    pattern: /pre-existing.*(?:IP|intellectual\s+property|work|tools?|templates?).*(?:assigned|transferred|belong|vest)/i,
    severity: "critical",
    baseConfidence: 0.95,
    explanation: "The clause explicitly transfers your pre-existing IP, not just project-specific work. This is highly unusual and unfair.",
    suggestedRewrite: "Pre-existing intellectual property, tools, and templates remain the sole property of the freelancer. Only project-specific deliverables are assigned.",
    impact: "You would permanently lose ownership of your own tools and frameworks that you use across multiple clients.",
    patternName: "pre-existing-ip-transfer",
  },

  // ────── NON-COMPETE ──────
  {
    riskType: "non-compete",
    pattern: /shall\s+not\s+(?:directly\s+or\s+indirectly\s+)?(?:compete|provide\s+(?:similar|competing)\s+services|engage\s+in\s+(?:similar|competing)).*(?:for|during)\s+(?:a\s+period\s+of\s+)?(?:twelve|24|36|eighteen|\d+)\s+months?/i,
    severity: "critical",
    baseConfidence: 0.91,
    explanation: "Post-termination non-compete clause restricts your ability to work in your field. Such broad clauses are difficult to enforce in India but create legal risk.",
    suggestedRewrite: "Remove the non-compete clause entirely, or limit it to a non-solicitation of the client's specific customers for 6 months maximum.",
    impact: "You could be legally barred from taking on new clients in your field for up to 12-36 months after this project ends.",
    patternName: "broad-non-compete",
  },
  {
    riskType: "non-compete",
    pattern: /(?:worldwide|global|india|pan-india).*(?:non-compete|restriction|exclusivity)/i,
    severity: "critical",
    baseConfidence: 0.90,
    explanation: "Geographic scope of the non-compete is excessively broad. Non-competes with nationwide or worldwide scope are disproportionate for freelance work.",
    suggestedRewrite: "Any post-engagement restrictions should be limited to the specific client accounts you worked on.",
    impact: "A geographically broad non-compete could prevent you from working anywhere in your country or globally.",
    patternName: "geographic-non-compete",
  },
  {
    riskType: "non-compete",
    pattern: /exclusive\s+(?:right|license|services?|provider|contractor)/i,
    severity: "important",
    baseConfidence: 0.85,
    explanation: "Exclusivity clause prevents you from working with other clients during the engagement, limiting your income potential.",
    suggestedRewrite: "The freelancer may provide services to other clients provided there is no conflict of interest with the current project.",
    impact: "You cannot take on other paid work during this engagement, putting all your income eggs in one basket.",
    patternName: "exclusivity-clause",
  },

  // ────── TERMINATION ──────
  {
    riskType: "termination",
    pattern: /(?:client|company|employer)\s+(?:may|shall\s+have\s+the\s+right\s+to)\s+terminate.*(?:without\s+(?:cause|reason|notice)|(?:at\s+(?:any\s+time|its?\s+(?:sole|absolute)\s+discretion)))/i,
    severity: "critical",
    baseConfidence: 0.90,
    explanation: "The client can terminate without cause or notice, leaving you without compensation for work in progress.",
    suggestedRewrite: "Either party may terminate with 14 days' written notice. Upon termination, the freelancer shall be paid for all work completed to date.",
    impact: "You could be terminated at any time without warning and potentially without pay for work already completed.",
    patternName: "unilateral-termination",
  },
  {
    riskType: "termination",
    pattern: /(?:immediate|instant)\s+termination.*(?:without|no)\s+(?:cure|remedy|notice)\s+period/i,
    severity: "critical",
    baseConfidence: 0.88,
    explanation: "Immediate termination without a cure period means you have no chance to fix any alleged breach before losing the contract.",
    suggestedRewrite: "In case of breach, the non-breaching party shall provide 14 days' written notice and an opportunity to cure before termination.",
    impact: "Any minor perceived breach could result in instant contract termination with no opportunity to resolve the issue.",
    patternName: "immediate-termination-no-cure",
  },
  {
    riskType: "termination",
    pattern: /(?:upon|after|following)\s+termination.*(?:no|shall\s+not\s+(?:be\s+)?(?:entitled|eligible|receive)).*(?:payment|compensation|fee)/i,
    severity: "critical",
    baseConfidence: 0.92,
    explanation: "No payment upon termination means you could lose compensation for work already completed.",
    suggestedRewrite: "Upon termination, the freelancer shall be paid for all work completed and expenses incurred up to the termination date.",
    impact: "If terminated, you may receive zero payment for potentially weeks or months of completed work.",
    patternName: "no-pay-on-termination",
  },

  // ────── LIABILITY ──────
  {
    riskType: "liability",
    pattern: /(?:unlimited|uncapped)\s+liability/i,
    severity: "critical",
    baseConfidence: 0.93,
    explanation: "Unlimited liability exposes you to claims far exceeding the project value. A liability cap is essential for freelancers.",
    suggestedRewrite: "The freelancer's total liability shall not exceed the total fees paid under this agreement.",
    impact: "You could face legal claims for an unlimited amount, potentially bankrupting your freelance business.",
    patternName: "unlimited-liability",
  },
  {
    riskType: "liability",
    pattern: /liability.*(?:cap|limit).*(?:shall\s+not\s+exceed|up\s+to|limited\s+to).*(?:\d+x|\d+\s+times)/i,
    severity: "important",
    baseConfidence: 0.80,
    explanation: "Liability cap is expressed as a multiple of fees. Check that the multiplier is reasonable (1x is standard for freelancers).",
    suggestedRewrite: "Liability shall be limited to 1x the total fees paid under this agreement.",
    impact: "A high multiplier means your potential exposure exceeds the project value significantly.",
    patternName: "liability-multiplier",
  },
  {
    riskType: "liability",
    pattern: /consequential\s+(?:damages?|losses?).*(?:excluded|waived|disclaimed)/i,
    severity: "safe",
    baseConfidence: 0.85,
    explanation: "Exclusion of consequential damages is standard and protects both parties from indirect loss claims.",
    suggestedRewrite: "No change needed — this is a standard and protective clause.",
    impact: "This clause actually protects you from disproportionate damage claims.",
    patternName: "consequential-damages-excluded",
  },

  // ────── INDEMNITY ──────
  {
    riskType: "indemnity",
    pattern: /(?:freelancer|contractor|consultant|you)\s+(?:shall|will|agrees?\s+to)\s+(?:indemnify|hold\s+harmless|defend).*(?:all|any|every)\s+(?:claims?|losses?|damages?|liabilities?|costs?)/i,
    severity: "critical",
    baseConfidence: 0.90,
    explanation: "One-sided indemnification clause makes you solely responsible for all claims, losses, and legal costs — even those arising from the client's actions.",
    suggestedRewrite: "Indemnification should be mutual. Each party indemnifies the other only for claims arising from their own negligence or breach.",
    impact: "You could be forced to pay for legal claims and damages that are not your fault.",
    patternName: "one-sided-indemnity",
  },
  {
    riskType: "indemnity",
    pattern: /indemni(?:ty|fication).*(?:survives?\s+termination|perpetual|indefinite|without\s+(?:time\s+)?limit)/i,
    severity: "critical",
    baseConfidence: 0.88,
    explanation: "Perpetual indemnification means your obligation to cover claims survives forever, even years after the contract ends.",
    suggestedRewrite: "Indemnification obligations shall survive for a maximum of 12 months after contract termination.",
    impact: "You remain liable for claims indefinitely, even long after the project relationship has ended.",
    patternName: "perpetual-indemnity",
  },

  // ────── CONFIDENTIALITY ──────
  {
    riskType: "confidentiality",
    pattern: /(?:all|any)\s+(?:information|data|materials?).*(?:deemed|treated\s+as|considered)\s+(?:to\s+be\s+)?confidential/i,
    severity: "important",
    baseConfidence: 0.83,
    explanation: "Clause treats ALL information as confidential by default. This is overly broad and could restrict you from discussing even routine project details.",
    suggestedRewrite: "Confidential information should be explicitly defined and marked as such in writing. Publicly available information should be excluded.",
    impact: "You may be unable to discuss any aspect of this engagement, even non-sensitive details, in your portfolio or with future clients.",
    patternName: "blanket-confidentiality",
  },
  {
    riskType: "confidentiality",
    pattern: /confidential.*(?:perpetual|indefinite|unlimited\s+duration|no\s+(?:expiry|time\s+limit))/i,
    severity: "important",
    baseConfidence: 0.85,
    explanation: "Perpetual confidentiality obligation with no expiry date is unreasonable. Standard is 2-5 years.",
    suggestedRewrite: "Confidentiality obligations shall remain in effect for 2 years after the termination of this agreement.",
    impact: "You could be bound by confidentiality restrictions forever, even decades after the contract ends.",
    patternName: "perpetual-confidentiality",
  },

  // ────── REVISIONS ──────
  {
    riskType: "revisions",
    pattern: /unlimited\s+(?:revisions?|changes?|modifications?|iterations?|rounds?)/i,
    severity: "critical",
    baseConfidence: 0.92,
    explanation: "Unlimited revisions clause allows the client to request infinite changes without additional compensation, leading to scope creep.",
    suggestedRewrite: "The project includes up to 2 rounds of revisions. Additional revisions shall be billed at the freelancer's standard hourly rate.",
    impact: "The client can demand endless changes, effectively reducing your per-hour rate to near zero.",
    patternName: "unlimited-revisions",
  },
  {
    riskType: "revisions",
    pattern: /no\s+(?:additional|extra)\s+(?:charge|fee|cost|compensation).*(?:revision|change|modification|alteration)/i,
    severity: "critical",
    baseConfidence: 0.90,
    explanation: "Revisions at no extra cost means your time spent on changes is unpaid, creating an incentive for the client to request excessive changes.",
    suggestedRewrite: "Revisions beyond the agreed scope shall incur additional charges at the freelancer's published rates.",
    impact: "Your effective hourly rate decreases with every revision request since none of them are compensated.",
    patternName: "free-revisions",
  },

  // ────── ACCEPTANCE ──────
  {
    riskType: "acceptance",
    pattern: /(?:sole|absolute|complete)\s+discretion.*(?:accept|approve|reject)/i,
    severity: "critical",
    baseConfidence: 0.89,
    explanation: "Acceptance at the client's sole discretion means there are no objective criteria for your work to be considered complete.",
    suggestedRewrite: "Acceptance criteria shall be defined in writing before work begins. Work shall be deemed accepted if no written objection is raised within 7 business days of delivery.",
    impact: "The client can reject completed work indefinitely with no objective standard, potentially withholding payment.",
    patternName: "sole-discretion-acceptance",
  },
  {
    riskType: "acceptance",
    pattern: /no\s+(?:objective|defined|written|clear)\s+(?:criteria|standard|benchmark).*(?:acceptance|approval|completion)/i,
    severity: "important",
    baseConfidence: 0.82,
    explanation: "Lack of defined acceptance criteria creates ambiguity about what constitutes completed work.",
    suggestedRewrite: "Acceptance criteria should be specified in the project scope document and agreed upon before work begins.",
    impact: "Without clear criteria, disputes about whether your work is 'done' can delay payment indefinitely.",
    patternName: "no-acceptance-criteria",
  },

  // ────── AUTO-RENEWAL ──────
  {
    riskType: "auto-renewal",
    pattern: /auto(?:matically)?\s*[-.]?\s*(?:renew|extend|continue)/i,
    severity: "important",
    baseConfidence: 0.84,
    explanation: "Auto-renewal means the contract extends automatically unless you explicitly opt out, which can trap you in unfavorable terms.",
    suggestedRewrite: "This agreement shall not auto-renew. Any extension requires mutual written consent from both parties.",
    impact: "If you miss the opt-out window, you may be bound by the contract for another term at potentially unfavorable rates.",
    patternName: "auto-renewal",
  },
  {
    riskType: "auto-renewal",
    pattern: /opt\s*[-.]?\s*out\s+(?:within|before|no\s+later\s+than)\s+\d+\s+days/i,
    severity: "important",
    baseConfidence: 0.80,
    explanation: "Short opt-out window for auto-renewal creates a risk of inadvertently extending the contract.",
    suggestedRewrite: "The opt-out notice period should be at least 30 days, and a reminder notification should be sent.",
    impact: "Missing a short opt-out deadline locks you into another contract term automatically.",
    patternName: "short-opt-out-window",
  },
];

// ── India-Specific Boosting ──────────────────────────────────────────────────
const INDIA_BOOST_PATTERNS = [
  /india/i,
  /indian\s+(?:law|jurisdiction|courts?)/i,
  /(?:bombay|delhi|bangalore|chennai|kolkata|mumbai|hyderabad)\s+(?:high\s+court|jurisdiction)/i,
  /(?:paise|INR|₹|rupees?)/i,
  /(?:section\s+27|indian\s+contract\s+act)/i,
];

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Runs the deterministic rule engine against a single clause.
 *
 * Returns:
 * - A RuleMatch if the clause matches a risk pattern
 * - null if no pattern matches (clause needs further analysis)
 *
 * Safe clauses return a RuleMatch with severity: "safe" and high confidence.
 */
export function runRuleEngine(clause: SegmentedClause): RuleMatch | null {
  const text = clause.clauseText;

  // Skip very short clauses and headings
  if (text.length < 20 || clause.clauseType === "heading") {
    return null;
  }

  // Check safe patterns first — if safe, return immediately
  for (const safe of SAFE_PATTERNS) {
    const match = text.match(safe.pattern);
    if (match) {
      return {
        riskType: safe.riskType,
        severity: "safe",
        confidence: 0.90,
        evidenceSnippet: match[0],
        explanation: safe.explanation,
        suggestedRewrite: "No change needed — this clause is within acceptable standards.",
        impact: "No negative impact — this clause is fair and standard.",
        detectionMethod: "rule",
        matchedPattern: "safe-pattern",
      };
    }
  }

  // Check risk rules
  let bestMatch: { rule: RuleDefinition; match: RegExpMatchArray } | null = null;
  let highestConfidence = 0;

  for (const rule of RISK_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      let adjustedConfidence = rule.baseConfidence;

      // Boost confidence if Indian context is detected in surrounding text
      const fullContext = text + " " + (clause.surroundingContext || "");
      for (const boostPattern of INDIA_BOOST_PATTERNS) {
        if (boostPattern.test(fullContext)) {
          adjustedConfidence = Math.min(adjustedConfidence + 0.03, 1.0);
          break;
        }
      }

      if (adjustedConfidence > highestConfidence) {
        highestConfidence = adjustedConfidence;
        bestMatch = { rule, match };
      }
    }
  }

  if (bestMatch) {
    return {
      riskType: bestMatch.rule.riskType,
      severity: bestMatch.rule.severity,
      confidence: highestConfidence,
      evidenceSnippet: bestMatch.match[0],
      explanation: bestMatch.rule.explanation,
      suggestedRewrite: bestMatch.rule.suggestedRewrite,
      impact: bestMatch.rule.impact,
      detectionMethod: "rule",
      matchedPattern: bestMatch.rule.patternName,
    };
  }

  return null;
}

/**
 * Quick check: does this clause need further analysis (embedding + possible Gemini)?
 *
 * Returns true if:
 * - Rule engine returned null (no pattern match — ambiguous)
 * - Rule engine returned a match but with low confidence (< 0.7)
 */
export function needsFurtherAnalysis(ruleResult: RuleMatch | null): boolean {
  if (!ruleResult) return true;
  if (ruleResult.severity === "safe" && ruleResult.confidence >= 0.8) return false;
  if (ruleResult.confidence < 0.7) return true;
  return false;
}
