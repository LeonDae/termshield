/**
 * Full pipeline smoke-test.
 * Creates a well-formed PDF with a UTF-8 text layer and hits POST /api/scan/upload.
 * Run from the project root:  node scripts/test-full-pipeline.mjs
 */

import http from "http";

// ─── Build a minimal but spec-compliant PDF with a visible text layer ──────────
function buildTextPDF(text) {
  // Encode text as PDF string (latin-1 safe, escape parens)
  const safe = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const stream = `BT /F1 11 Tf 40 750 Td 14 TL (${safe}) Tj ET`;
  const streamLen = Buffer.byteLength(stream, "latin1");

  const objects = [
    /*1*/ "<</Type /Catalog /Pages 2 0 R>>",
    /*2*/ "<</Type /Pages /Kids [3 0 R] /Count 1>>",
    /*3*/ `<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
  /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>`,
    /*4*/ `<</Length ${streamLen}>>\nstream\n${stream}\nendstream`,
    /*5*/ "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>",
  ];

  const offsets = [];
  let body = "%PDF-1.4\n";

  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = body.length;
  body += "xref\n";
  body += `0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.forEach((o) => {
    body += String(o).padStart(10, "0") + " 00000 n \n";
  });
  body += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

const CONTRACT = `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 1, 2025, 
between Acme Corp ("Client") and John Doe ("Contractor").

1. INTELLECTUAL PROPERTY
All work product, inventions, software, designs, and deliverables created by Contractor 
under this Agreement shall be the exclusive property of the Client. Contractor irrevocably 
assigns all intellectual property rights to Client, including copyrights and patents.

2. PAYMENT TERMS
Client agrees to pay Contractor a fee of INR 50,000 per month. Invoices are due within 
60 days of receipt. Late payments accrue interest at 18% per annum. Client may deduct 
withholding tax as required by Indian law.

3. NON-COMPETE CLAUSE
Contractor agrees not to engage in any business that competes with Client for a period of 
3 years after termination of this Agreement, within any geography where Client operates. 
Contractor shall not solicit Client's employees or customers during this period.

4. TERMINATION
Either party may terminate this Agreement with 14 days written notice. Upon termination,
Client may withhold final payment pending handover of all deliverables and work-in-progress.
Client reserves the right to terminate immediately for breach without any cure period.`;

// ─── POST the PDF ───────────────────────────────────────────────────────────────
const boundary = "----TermShieldBoundary" + Date.now();
const pdfBuf = buildTextPDF(CONTRACT);

const head1 = Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="planType"\r\n\r\nbasic\r\n`
);
const head2 = Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="contract.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
);
const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([head1, head2, pdfBuf, tail]);

console.log(`\n📤  Sending PDF (${pdfBuf.length} bytes) to POST /api/scan/upload …\n`);

const req = http.request(
  {
    hostname: "localhost",
    port: 3001,
    path: "/api/scan/upload",
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length,
    },
  },
  (res) => {
    let raw = "";
    res.on("data", (c) => (raw += c));
    res.on("end", () => {
      console.log(`📬  HTTP ${res.statusCode}`);
      try {
        const json = JSON.parse(raw);
        console.log(JSON.stringify(json, null, 2));
        if (json.scan?.id) {
          console.log(`\n✅  Scan created: ${json.scan.id}`);
        }
      } catch {
        console.log(raw);
      }
    });
  }
);

req.on("error", (e) => console.error("❌  Request error:", e.message));
req.write(body);
req.end();
