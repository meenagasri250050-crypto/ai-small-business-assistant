import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function aiAssistantPlugin(): Plugin {
  return {
    name: 'ai-assistant-api',
    configureServer(server) {
      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { prompt, businessContext } = JSON.parse(body || '{}');

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'GEMINI_API_KEY is not set in environment. Please add it to your project secrets in AI Studio.'
              }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
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

            const replyText = response.text || 'I could not generate a response. Please try asking again.';

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply: replyText }));
          } catch (err: any) {
            console.error('API Assistant Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal server error while processing AI request.' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiAssistantPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
