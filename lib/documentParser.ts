import pdfParse from 'pdf-parse';
import officeParser from 'officeparser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Tesseract from 'tesseract.js';
import { fromBuffer } from 'pdf2pic';

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png'].includes(ext as string)) {
    console.log("Running OCR on image upload...");
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    return text;
  }

  if (ext === 'txt') {
    return buffer.toString('utf-8');
  }

  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    
    // Check if the PDF has actual machine-readable text
    if (data.text.trim().length < 50) {
      console.log("Scanned PDF detected. Triggering OCR Fallback...");
      
      const options = {
        density: 300,
        saveFilename: `temp_${Date.now()}`,
        savePath: os.tmpdir(),
        format: "png",
        width: 1024
      };
      
      const convert = fromBuffer(buffer, options);
      const pageToConvertAsImage = 1;
      
      let fullText = "";
      // For simplicity in a serverless/docker environment, we'll OCR the first 5 pages max 
      // to prevent extreme memory and CPU timeouts. 
      const maxPages = Math.min(data.numpages || 1, 5); 
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const resolve = await convert(page, { responseType: "image" });
          // The resolve returns base64 image if responseType is "image"
          const imgBuffer = Buffer.from(resolve.base64 as string, 'base64');
          const { data: { text } } = await Tesseract.recognize(imgBuffer, 'eng');
          fullText += text + "\n\n";
        } catch (e) {
          console.error(`OCR failed on page ${page}:`, e);
        }
      }
      return fullText.trim() || data.text; // return original empty text if OCR fails
    }
    
    return data.text;
  }

  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext as string)) {
    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${filename}`);
    fs.writeFileSync(tempFilePath, buffer);
    
    try {
      const text = await officeParser.parseOfficeAsync(tempFilePath);
      return text;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function chunkText(text: string, maxTokens: number = 200, overlap: number = 50): string[] {
  // A rough approximation: 1 token ~= 4 chars
  const maxChars = maxTokens * 4;
  const overlapChars = overlap * 4;
  
  const chunks: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    let end = i + maxChars;
    if (end > text.length) {
      end = text.length;
    } else {
      // Try to find a natural break point (newline or period)
      const substring = text.slice(i, end);
      const lastNewline = substring.lastIndexOf('\n');
      const lastPeriod = substring.lastIndexOf('. ');
      
      const breakPoint = Math.max(lastNewline, lastPeriod);
      if (breakPoint > maxChars * 0.5) { // Only break if it's past the halfway point
        end = i + breakPoint + 1; // Include the newline/period
      }
    }
    
    const chunkStr = text.slice(i, end).trim();
    if (chunkStr.length > 20) {
      chunks.push(chunkStr);
    }
    
    i = end - overlapChars; // Move forward, but overlap
    if (i < 0) i = 0; // Prevent infinite loops or negative indices
    if (end >= text.length) break;
  }
  
  return chunks;
}
