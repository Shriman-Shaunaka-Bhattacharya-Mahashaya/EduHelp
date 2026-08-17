import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import officeParser from 'officeparser';
import pdfParse from 'pdf-parse';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let rawText = "";

    try {
      // PDF specific parsing
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
      } 
      // TXT parsing
      else if (file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain') {
        rawText = buffer.toString('utf-8');
      } 
      // PPTX, DOCX, XLSX using officeparser
      else {
        // officeParser needs a file path, so we temporarily save it
        const tempFilePath = join(tmpdir(), `temp_announcement_${Date.now()}_${file.name}`);
        await writeFile(tempFilePath, buffer);
        
        try {
          rawText = await officeParser.parseOfficeAsync(tempFilePath);
        } finally {
          // Always cleanup the temp file
          await unlink(tempFilePath).catch(() => {});
        }
      }
    } catch (parseErr) {
      console.error("Document Extraction Error:", parseErr);
      return NextResponse.json({ message: "Failed to extract text from the uploaded document. Ensure it is a valid format (.txt, .pdf, .docx, .pptx, .xlsx)." }, { status: 400 });
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ message: 'Document is empty or unreadable' }, { status: 400 });
    }

    return NextResponse.json({ text: rawText }, { status: 200 });

  } catch (error: any) {
    console.error('Parse Route Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
