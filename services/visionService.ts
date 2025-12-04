/**
 * Vision & OCR Service - Image Analysis and Text Extraction
 * 
 * Uses Groq's Llama 4 vision models for:
 * - OCR (Optical Character Recognition) from images and scanned PDFs
 * - Document structure analysis (tables, forms, invoices)
 * - Image content description and captioning
 * - Chart/diagram interpretation
 * - Handwriting recognition
 * 
 * Models:
 * - meta-llama/llama-4-maverick-17b-128e-instruct: Best quality vision
 * - meta-llama/llama-4-scout-17b-16e-instruct: Fast, cost-effective
 */

import { supabase } from '../lib/supabase';

// Supported image formats
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'gif' | 'webp';

// Document types for structured extraction
export type DocumentType = 
  | 'general'       // General document/text
  | 'invoice'       // Invoices with line items
  | 'receipt'       // Receipts/transactions
  | 'form'          // Fillable forms
  | 'table'         // Tabular data
  | 'contract'      // Legal documents
  | 'business-card' // Business/contact cards
  | 'handwritten'   // Handwritten notes
  | 'chart'         // Charts/graphs
  | 'diagram';      // Technical diagrams

export interface OCRResult {
  text: string;
  confidence?: number;
  language?: string;
  structuredData?: Record<string, unknown>;
  documentType?: DocumentType;
  model: string;
  latencyMs: number;
}

export interface ImageAnalysisResult {
  description: string;
  objects?: string[];
  text?: string;
  colors?: string[];
  tags?: string[];
  model: string;
  latencyMs: number;
}

export interface StructuredDocumentResult {
  type: DocumentType;
  data: Record<string, unknown>;
  rawText: string;
  confidence: number;
  model: string;
  latencyMs: number;
}

export interface VisionOptions {
  model?: 'maverick' | 'scout'; // maverick = quality, scout = speed
  documentType?: DocumentType;
  extractStructured?: boolean;
  language?: string;
  maxTokens?: number;
}

/**
 * Convert image file to base64 data URL
 */
export async function imageToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from image using OCR (Llama 4 Vision)
 */
export async function extractTextFromImage(
  image: File | Blob | string, // File, Blob, or base64 data URL
  options: VisionOptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  const { model = 'scout', documentType = 'general', language } = options;

  // Convert to base64 if needed
  let imageData: string;
  if (typeof image === 'string') {
    imageData = image;
  } else {
    imageData = await imageToBase64(image);
  }

  // Build prompt based on document type
  let prompt = 'Extract all text from this image accurately. ';
  
  switch (documentType) {
    case 'invoice':
      prompt = 'Extract all text from this invoice image. Include: company names, addresses, invoice number, date, line items with quantities and prices, totals, and payment terms.';
      break;
    case 'receipt':
      prompt = 'Extract all text from this receipt. Include: store name, date, items purchased, prices, subtotal, tax, and total.';
      break;
    case 'form':
      prompt = 'Extract all text from this form, including field labels and filled-in values. Maintain the structure showing which values belong to which fields.';
      break;
    case 'table':
      prompt = 'Extract all text from this table/spreadsheet image. Preserve the row and column structure as much as possible.';
      break;
    case 'contract':
      prompt = 'Extract all text from this legal document/contract. Include headers, paragraphs, clauses, and any signature blocks.';
      break;
    case 'business-card':
      prompt = 'Extract all information from this business card. Include: name, title, company, phone numbers, email, address, and website.';
      break;
    case 'handwritten':
      prompt = 'Carefully transcribe the handwritten text in this image. Do your best to interpret the handwriting accurately.';
      break;
    case 'chart':
      prompt = 'Describe and interpret this chart/graph. Include the type of chart, axis labels, data points or trends, and any conclusions that can be drawn.';
      break;
    case 'diagram':
      prompt = 'Describe this diagram including all labels, connections, and the overall structure or workflow it represents.';
      break;
    default:
      prompt = 'Extract and transcribe all text visible in this image. Maintain the reading order and structure.';
  }

  if (language) {
    prompt += ` The text is in ${language}.`;
  }

  const modelId = model === 'maverick' 
    ? 'meta-llama/llama-4-maverick-17b-128e-instruct'
    : 'meta-llama/llama-4-scout-17b-16e-instruct';

  const { data, error } = await supabase.functions.invoke('vision-analyze', {
    body: {
      image: imageData,
      prompt,
      model: modelId,
      maxTokens: options.maxTokens || 2000,
    },
  });

  if (error) {
    throw new Error(`OCR failed: ${error.message}`);
  }

  return {
    text: data.text || '',
    confidence: data.confidence,
    language: data.language,
    documentType,
    model: modelId,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Analyze image content (description, objects, colors)
 */
export async function analyzeImage(
  image: File | Blob | string,
  options: VisionOptions = {}
): Promise<ImageAnalysisResult> {
  const startTime = Date.now();
  const { model = 'scout' } = options;

  let imageData: string;
  if (typeof image === 'string') {
    imageData = image;
  } else {
    imageData = await imageToBase64(image);
  }

  const prompt = `Analyze this image and provide:
1. A detailed description of what's shown
2. Key objects or elements visible
3. Any text visible in the image
4. Dominant colors
5. Relevant tags or categories

Return as JSON with keys: description, objects (array), text, colors (array), tags (array)`;

  const modelId = model === 'maverick' 
    ? 'meta-llama/llama-4-maverick-17b-128e-instruct'
    : 'meta-llama/llama-4-scout-17b-16e-instruct';

  const { data, error } = await supabase.functions.invoke('vision-analyze', {
    body: {
      image: imageData,
      prompt,
      model: modelId,
      responseFormat: 'json',
      maxTokens: 1000,
    },
  });

  if (error) {
    throw new Error(`Image analysis failed: ${error.message}`);
  }

  // Parse JSON response
  let parsed: Record<string, unknown> = {};
  try {
    if (typeof data.text === 'string') {
      // Try to extract JSON from response
      const jsonMatch = data.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } else if (typeof data.text === 'object') {
      parsed = data.text;
    }
  } catch {
    // If JSON parsing fails, use text as description
    parsed = { description: data.text };
  }

  return {
    description: (parsed.description as string) || data.text || '',
    objects: parsed.objects as string[] | undefined,
    text: parsed.text as string | undefined,
    colors: parsed.colors as string[] | undefined,
    tags: parsed.tags as string[] | undefined,
    model: modelId,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Extract structured data from document image
 */
export async function extractStructuredDocument(
  image: File | Blob | string,
  documentType: DocumentType,
  options: VisionOptions = {}
): Promise<StructuredDocumentResult> {
  const startTime = Date.now();
  const { model = 'maverick' } = options; // Use maverick for structured extraction

  let imageData: string;
  if (typeof image === 'string') {
    imageData = image;
  } else {
    imageData = await imageToBase64(image);
  }

  // Build structured extraction prompt
  let prompt: string;
  let schema: string;

  switch (documentType) {
    case 'invoice':
      schema = `{
  "vendor": { "name": "", "address": "", "phone": "", "email": "" },
  "customer": { "name": "", "address": "" },
  "invoiceNumber": "",
  "date": "",
  "dueDate": "",
  "lineItems": [{ "description": "", "quantity": 0, "unitPrice": 0, "total": 0 }],
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "paymentTerms": ""
}`;
      prompt = `Extract all data from this invoice image into structured JSON matching this schema:\n${schema}\n\nExtract actual values, use null for missing fields.`;
      break;

    case 'receipt':
      schema = `{
  "merchant": { "name": "", "address": "", "phone": "" },
  "date": "",
  "time": "",
  "items": [{ "name": "", "quantity": 1, "price": 0 }],
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "paymentMethod": ""
}`;
      prompt = `Extract all data from this receipt into structured JSON matching this schema:\n${schema}`;
      break;

    case 'business-card':
      schema = `{
  "name": "",
  "title": "",
  "company": "",
  "phone": [],
  "email": "",
  "address": "",
  "website": "",
  "socialMedia": {}
}`;
      prompt = `Extract all contact information from this business card into structured JSON matching this schema:\n${schema}`;
      break;

    case 'table':
      schema = `{
  "headers": [],
  "rows": [[]],
  "summary": ""
}`;
      prompt = `Extract the table data from this image into structured JSON with headers and rows:\n${schema}`;
      break;

    default:
      schema = `{ "content": "", "sections": [], "metadata": {} }`;
      prompt = `Extract the document content into structured JSON:\n${schema}`;
  }

  const modelId = 'meta-llama/llama-4-maverick-17b-128e-instruct';

  const { data, error } = await supabase.functions.invoke('vision-analyze', {
    body: {
      image: imageData,
      prompt,
      model: modelId,
      responseFormat: 'json',
      maxTokens: 3000,
    },
  });

  if (error) {
    throw new Error(`Structured extraction failed: ${error.message}`);
  }

  // Parse structured data
  let structuredData: Record<string, unknown> = {};
  let rawText = '';
  
  try {
    if (typeof data.text === 'string') {
      rawText = data.text;
      const jsonMatch = data.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      }
    } else if (typeof data.text === 'object') {
      structuredData = data.text;
      rawText = JSON.stringify(data.text, null, 2);
    }
  } catch {
    rawText = data.text || '';
  }

  return {
    type: documentType,
    data: structuredData,
    rawText,
    confidence: data.confidence || 0.8,
    model: modelId,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Generate alt text/caption for image
 */
export async function generateImageCaption(
  image: File | Blob | string,
  options: { detailed?: boolean } = {}
): Promise<string> {
  const { detailed = false } = options;

  let imageData: string;
  if (typeof image === 'string') {
    imageData = image;
  } else {
    imageData = await imageToBase64(image);
  }

  const prompt = detailed
    ? 'Provide a detailed description of this image suitable for accessibility (alt text). Include all important visual elements, text, and context.'
    : 'Provide a brief, concise caption for this image (1-2 sentences) suitable for alt text.';

  const { data, error } = await supabase.functions.invoke('vision-analyze', {
    body: {
      image: imageData,
      prompt,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens: 300,
    },
  });

  if (error) {
    throw new Error(`Caption generation failed: ${error.message}`);
  }

  return data.text || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
}

/**
 * Check if PDF might be scanned (image-based)
 */
export function mightBeScannedPDF(extractedText: string, pageCount: number): boolean {
  // If we got very little text per page, it might be scanned
  const avgCharsPerPage = extractedText.length / pageCount;
  return avgCharsPerPage < 100; // Less than 100 chars per page suggests scanned
}

/**
 * Process PDF pages as images for OCR
 * This is a helper that should be called when regular PDF extraction fails
 */
export async function ocrPdfPages(
  pdfImages: string[], // Array of base64 page images
  options: VisionOptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  const results: string[] = [];

  // Process pages in parallel (up to 5 at a time)
  const batchSize = 5;
  for (let i = 0; i < pdfImages.length; i += batchSize) {
    const batch = pdfImages.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(pageImage => extractTextFromImage(pageImage, { ...options, model: 'scout' }))
    );
    results.push(...batchResults.map(r => r.text));
  }

  return {
    text: results.join('\n\n--- Page Break ---\n\n'),
    documentType: options.documentType || 'general',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    latencyMs: Date.now() - startTime,
  };
}
