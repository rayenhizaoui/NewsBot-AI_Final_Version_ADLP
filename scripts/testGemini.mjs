import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY env var is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function main() {
  const chat = await ai.chats.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: 'You are a helpful assistant.',
      tools: [{ googleSearch: {} }],
    },
  });

  const response = await chat.sendMessage({ message: 'Hello from Node test.' });
  console.log('Response keys:', Object.keys(response));
  console.dir(response, { depth: null });
}

main().catch((err) => {
  console.error('Error during Gemini test:', err);
  process.exit(1);
});
