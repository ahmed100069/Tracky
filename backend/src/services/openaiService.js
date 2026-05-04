import OpenAI from "openai";

let client;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

export const parseVoiceOrderWithAi = async ({ transcript, menuItems }) => {
  const openai = getClient();
  if (!openai) return null;

  const menuSummary = menuItems.map((item) => `${item.name} - Rs ${item.price}`).join(", ");

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "Convert Hindi or English restaurant voice orders into JSON. Only use items from the provided menu. Output valid JSON with keys items and notes."
      },
      {
        role: "user",
        content: `Menu: ${menuSummary}\nTranscript: ${transcript}`
      }
    ]
  });

  const text = response.output_text?.trim();
  if (!text) return null;

  return JSON.parse(text);
};

export const generateInsightsWithAi = async (prompt) => {
  const openai = getClient();
  if (!openai) return null;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are Tracky, an AI business helper for dhaba owners. Reply in 3 short practical insights in simple Hinglish."
      },
      { role: "user", content: prompt }
    ]
  });

  return response.output_text?.trim() || null;
};
