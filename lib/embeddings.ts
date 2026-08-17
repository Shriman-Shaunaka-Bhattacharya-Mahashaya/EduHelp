import { pipeline, env } from '@xenova/transformers';

// Disable local model caching downloading to root directory,
// enforce usage of cache directory or purely in-memory
env.allowLocalModels = false;
env.useBrowserCache = false;

class EmbeddingsPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        quantized: true, // Use quantized model for faster CPU inference
      });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embedder = await EmbeddingsPipeline.getInstance();
    
    // Generate embedding
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to standard JS Array
    return Array.from(output.data);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error("Failed to generate embedding");
  }
}
