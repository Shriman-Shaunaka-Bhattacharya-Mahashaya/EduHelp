import pdfParse from 'pdf-parse';
import officeParser from 'officeparser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'txt') {
    return buffer.toString('utf-8');
  }

  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
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
