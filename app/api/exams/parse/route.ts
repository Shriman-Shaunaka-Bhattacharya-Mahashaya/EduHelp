import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
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
        const tempFilePath = join(tmpdir(), `temp_exam_${Date.now()}_${file.name}`);
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

    // Limit text size to prevent exceeding token limits (rough estimate: 25k chars ~ 6k tokens)
    const truncatedText = rawText.substring(0, 25000);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'GROQ_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // Call Groq API
    const systemPrompt = `You are a strict JSON extraction AI for an examination system.
Your job is to read raw, unstructured exam text and output a perfectly formatted JSON object.
The JSON object MUST have exactly one root key called "questions", which contains an array of question objects.
Each question object MUST have:
1. "questionText": string
2. "options": array of exactly 4 strings
3. "correctOptionIndex": integer (0 to 3) representing the correct answer in the options array.

Infer the correct answer if implicitly marked (e.g., by an asterisk, bolding, or an answer key). If you absolutely cannot determine the answer, guess or set to 0.

Example Output format:
{
  "questions": [
    {
      "questionText": "What is the capital of France?",
      "options": ["Berlin", "London", "Paris", "Madrid"],
      "correctOptionIndex": 2
    }
  ]
}

DO NOT include markdown formatting. Output strictly valid JSON.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract the exam questions from the following text:\n\n${truncatedText}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq API Error:", err);
      return NextResponse.json({ message: 'AI Parsing failed' }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const content = groqData.choices[0].message.content;
    
    // Parse the JSON string from Groq
    const parsedJson = JSON.parse(content);
    
    if (!parsedJson.questions || !Array.isArray(parsedJson.questions)) {
       throw new Error("AI did not return a valid questions array");
    }

    return NextResponse.json({ questions: parsedJson.questions }, { status: 200 });

  } catch (error: any) {
    console.error('Parse Route Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
