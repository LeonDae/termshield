/**
 * Directly tests pdf-parse outside of Next.js to see the raw error.
 * Run: node scripts/test-pdf-parse-direct.mjs
 */
import pdf from "pdf-parse/lib/pdf-parse.js";

// Build a proper PDF with embedded text
function buildTextPDF(text) {
  const safe = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT /F1 11 Tf 40 750 Td (${safe}) Tj ET`;
  const streamLen = Buffer.byteLength(stream, "latin1");

  const objects = [
    "<</Type /Catalog /Pages 2 0 R>>",
    "<</Type /Pages /Kids [3 0 R] /Count 1>>",
    `<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>`,
    `<</Length ${streamLen}>>\nstream\n${stream}\nendstream`,
    "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>",
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
  offsets.forEach((o) => body += String(o).padStart(10, "0") + " 00000 n \n");
  body += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

const buf = buildTextPDF(
  "This is a test contract. The intellectual property shall belong to the client. " +
  "Payment is due in 30 days. Non-compete clause of 2 years. Termination with 30 days notice."
);

console.log("Testing pdf-parse directly...");
console.log("PDF buffer size:", buf.length);

try {
  const result = await pdf(buf);
  console.log("\n✅ pdf-parse SUCCESS");
  console.log("Pages:", result.numpages);
  console.log("Text length:", result.text.length);
  console.log("Extracted text:", result.text.substring(0, 300));
} catch (err) {
  console.error("\n❌ pdf-parse FAILED");
  console.error("Error name:", err.name);
  console.error("Error message:", err.message);
  console.error("Stack:", err.stack);
}
