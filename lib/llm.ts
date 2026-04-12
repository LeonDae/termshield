import { GoogleGenAI, Type, Schema } from "@google/genai";
import { z } from "zod";

export const RISK_CATEGORIES = [
  "ip",
  "payment",
  "non-compete",
  "termination",
] as const;

// Zod schema for validation
export const RiskAnalysisSchema = z.object({
  risks: z.array(
    z.object({
      category: z.enum(["ip", "payment", "non-compete", "termination"]),
      severity: z.enum(["critical", "important", "safe"]),
      clause_text: z.string(),
      explanation: z.string(),
      fix_message: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ).length(4), // Exactly 4 risks, one for each category
});

export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The response schema for the Gemini API
const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["ip", "payment", "non-compete", "termination"],
          },
          severity: {
            type: Type.STRING,
            enum: ["critical", "important", "safe"],
          },
          clause_text: {
            type: Type.STRING,
            description: "The original text of the clause being analyzed",
          },
          explanation: {
            type: Type.STRING,
            description: "Plain English explanation of why this is risky",
          },
          fix_message: {
            type: Type.STRING,
            description: "Suggested negotiation message to fix the clause",
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confidence score between 0 and 1",
          },
        },
        required: [
          "category",
          "severity",
          "clause_text",
          "explanation",
          "fix_message",
          "confidence",
        ],
      },
    },
  },
  required: ["risks"],
};

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function analyzeContractRisks(contractText: string): Promise<RiskAnalysis> {
  // Step 1: Chunk the document using LangChain
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  });

  const documents = await splitter.createDocuments([contractText]);
  const chunks = documents.map(d => d.pageContent);

  // Step 2: Extract embeddings for the document chunks
  const embeddingsModel = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "text-embedding-004", // Standard Gemini embedding model
  });

  const chunkEmbeddings = await embeddingsModel.embedDocuments(chunks);

  // Step 3: Define risk categories queries and get their embeddings
  const queries = [
    "intellectual property, ownership, copyright, IP rights",
    "payment terms, compensation, late fees, invoices, salary",
    "non-compete, exclusivity, future employment, restriction",
    "termination, cancellation, end of contract, exit clause",
  ];

  const queryEmbeddings = await embeddingsModel.embedDocuments(queries);

  // Step 4: Retrieve the top 3 most relevant chunks for each category
  const retrievedChunks = new Set<string>();

  queryEmbeddings.forEach((queryEmbedding) => {
    // Calculate similarities for this query against all chunks
    const similarities = chunkEmbeddings.map((chunkEmb, index) => ({
      index,
      score: cosineSimilarity(queryEmbedding, chunkEmb),
    }));

    // Sort by descending score
    similarities.sort((a, b) => b.score - a.score);

    // Grab the top 3 chunks for this query
    const top3 = similarities.slice(0, 3).map(s => chunks[s.index]);
    top3.forEach(text => retrievedChunks.add(text));
  });

  // Combine unique retrieved chunks into a condensed targeted document
  const ragContext = Array.from(retrievedChunks).join("\n\n---\n\n");

  // Step 5: Use existing Gemini API but feed it ONLY the condensed RAG context
  const prompt = [
    "You are a legal contract analyzer for Indian freelancers.",
    "Analyze the following contract excerpts for risky clauses.",
    "You must return exactly four risk assessments: one for 'ip', one for 'payment', one for 'non-compete', and one for 'termination'.",
    "For each category, determine the severity ('critical', 'important', or 'safe') and provide the specific clause text, an explanation, and a suggested fix message.",
    "Respond using the provided JSON schema.",
    "",
    "Retrieved Contract Excerpts (RAG Context):",
    ragContext,
  ].join("\n");

  let parsedAnalysis: RiskAnalysis;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
        temperature: 0.2, // Low temperature for more deterministic output
      },
    });

    if (!response.text) {
      throw new Error("No response text from Gemini API");
    }

    const rawData = JSON.parse(response.text);
    parsedAnalysis = RiskAnalysisSchema.parse(rawData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod Validation Failed:", error.errors);
      throw new Error("Failed to parse risk analysis matching the required schema.");
    }

    console.error("Gemini API Error:", error);
    throw error;
  }

  return parsedAnalysis;
}

