import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Server-side AI assistant proxy endpoint
app.post('/api/assistant', async (req, res) => {
  try {
    const { prompt, businessContext } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are the AI Business Assistant for a small retail shop / side hustle.
Your goal is to help the shop owner understand their actual business figures, spot trends, highlight restocking urgencies, and provide actionable tips to increase profit.

STRICT CONSTRAINTS:
1. Ground all your answers strictly in the shop owner's live data provided below. Never invent fictional products, prices, or numbers.
2. If data is zero or missing (e.g. no sales yet or no expenses recorded), state that clearly and provide advice on how to start recording.
3. Always use the store's currency (${businessContext?.currency || '₹'}).
4. Format your responses with clean, easy-to-read markdown: bold headers, short bullet points, and concise takeaway summaries. Non-technical retail shop owners should understand your advice immediately.

CURRENT STORE CONTEXT:
${JSON.stringify(businessContext, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ reply: response.text || 'No response generated.' });
  } catch (err: any) {
    console.error('Server AI error:', err);
    res.status(500).json({ error: err.message || 'Error executing AI request' });
  }
});

// Serve frontend production build
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
