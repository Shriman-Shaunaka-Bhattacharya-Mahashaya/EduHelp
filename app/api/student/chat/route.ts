import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import DocumentChunk from '../../../../models/DocumentChunk';
import { generateEmbedding } from '../../../../lib/embeddings';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { messages, contentId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: 'Invalid messages array' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1].content;
    let contextText = "";

    // If querying a specific document, use RAG
    if (contentId) {
      await connectDB();
      const queryEmbedding = await generateEmbedding(latestMessage);

      // Perform Atlas Vector Search
      const vectorResults = await DocumentChunk.aggregate([
        {
          $vectorSearch: {
            index: "VectorSearchIndex",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5,
            filter: { contentId: new mongoose.Types.ObjectId(contentId) }
          }
        },
        {
          $project: {
            text: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      if (vectorResults && vectorResults.length > 0) {
        contextText = "Use the following retrieved document context to answer the student's question:\n\n";
        vectorResults.forEach((doc, idx) => {
          contextText += `--- Context Snippet ${idx + 1} ---\n${doc.text}\n\n`;
        });
      } else {
        contextText = "No relevant context found in the document for this query.\n\n";
      }
    }

    // Prepare Groq API Messages
    const groqMessages = [
      {
        role: "system",
        content: `You are an intelligent educational AI assistant for students. 
        ${contextText ? 'You are currently helping a student understand a specific document.\n\n' + contextText : 'You are helping a student with general questions.'}
        Be helpful, concise, and academically accurate. Base your answers on the provided context if available.`
      },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: groqMessages,
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 1024
      })
    });

    if (!groqResponse.ok) {
      let errorData;
      try {
        errorData = await groqResponse.json();
      } catch (e) {
        errorData = await groqResponse.text();
      }
      console.error("Groq API Error Data:", errorData);
      return NextResponse.json({ 
        message: "Groq API rejected the request", 
        groqError: errorData 
      }, { status: 502 });
    }

    const groqData = await groqResponse.json();
    const reply = groqData.choices[0].message.content;

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
