import PDFParser from "pdf2json";

const MIN_EXTRACTED_TEXT_LENGTH = 120;

/**
 * Extracts text from a PDF buffer. Throws if the PDF has no text layer
 * (i.e. scanned image PDFs) or if the extracted text is too short to be
 * a meaningful contract.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true); // true = plain text mode

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error("PDF Parsing error:", errData.parserError);
      reject(
        new Error(
          "The uploaded PDF file is corrupted or could not be read (e.g., bad format or XRef entry). " +
          "Please re-save the PDF or paste the text directly."
        )
      );
    });

    pdfParser.on("pdfParser_dataReady", () => {
      const parsedText = pdfParser.getRawTextContent();
      const text = cleanContractText(parsedText);

      if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
        reject(
          new Error(
            "This PDF appears to be an image or contains too little text. " +
            "Please copy-paste the contract text instead."
          )
        );
      } else {
        resolve(text);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Advanced contract text cleaning pipeline.
 * - Removes null bytes and control characters
 * - Removes headers, footers, and page numbers
 * - Normalizes whitespace while preserving paragraph structure
 * - Preserves clause numbering (1., 1.1, (a), etc.) and section headings
 */
export function cleanContractText(text: string): string {
  let cleaned = text;

  // Step 1: Remove null bytes and control characters (keep \n, \r, \t)
  cleaned = cleaned
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Step 2: Normalize line endings to \n
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 3: Remove common PDF page markers
  // "Page X of Y", "Page X", "- X -", standalone page numbers at line start
  cleaned = cleaned.replace(/^\s*(?:page\s+)?\d+\s*(?:of\s+\d+)?\s*$/gim, "");
  cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, "");

  // Step 4: Remove repeated header/footer lines
  // Detect lines that appear 3+ times (likely headers/footers)
  const lines = cleaned.split("\n");
  const lineFreq = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 120) {
      lineFreq.set(trimmed, (lineFreq.get(trimmed) || 0) + 1);
    }
  }
  const repeatedLines = new Set<string>();
  for (const [line, count] of lineFreq) {
    if (count >= 3) {
      repeatedLines.add(line);
    }
  }
  if (repeatedLines.size > 0) {
    cleaned = lines
      .filter((line) => !repeatedLines.has(line.trim()))
      .join("\n");
  }

  // Step 5: Collapse excessive blank lines (3+ → 2) while preserving paragraph breaks
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Step 6: Collapse multiple spaces within a line (but preserve leading indentation)
  cleaned = cleaned
    .split("\n")
    .map((line) => {
      const leadingWhitespace = line.match(/^(\s*)/)?.[0] || "";
      const rest = line.slice(leadingWhitespace.length);
      return leadingWhitespace + rest.replace(/  +/g, " ");
    })
    .join("\n");

  // Step 7: Trim the entire text
  cleaned = cleaned.trim();

  return cleaned;
}

