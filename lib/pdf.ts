import PDFParser from "pdf2json";

const MIN_EXTRACTED_TEXT_LENGTH = 120;

/**
 * Extracts text from a PDF buffer. Throws if the PDF has no text layer
 * (i.e. scanned image PDFs) or if the extracted text is too short to be
 * a meaningful contract.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1); // 1 = plain text mode

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
      const text = sanitizeExtractedText(parsedText);

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
