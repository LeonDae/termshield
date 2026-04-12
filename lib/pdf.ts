import pdf from "pdf-parse";

const MIN_EXTRACTED_TEXT_LENGTH = 120;

/**
 * Extracts text from a PDF buffer. Throws if the PDF has no text layer
 * (i.e. scanned image PDFs) or if the extracted text is too short to be
 * a meaningful contract.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let result;
  try {
    result = await pdf(buffer);
  } catch (err: unknown) {
    throw new Error(
      "The uploaded PDF file is corrupted or could not be read (e.g., bad format or XRef entry). " +
      "Please re-save the PDF or paste the text directly."
    );
  }

  const text = sanitizeExtractedText(result.text);

  if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new Error(
      "This PDF appears to be an image or contains too little text. " +
      "Please copy-paste the contract text instead."
    );
  }

  return text;
}

/**
 * Collapses whitespace runs into single spaces and trims.
 * Removes null bytes and other control characters that can break JSON serialization.
 */
export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/\0/g, "")             // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "") // Remove control chars (keep \n, \r, \t)
    .replace(/\s+/g, " ")           // Collapse whitespace
    .trim();
}
