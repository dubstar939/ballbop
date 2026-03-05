
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAITip = async (score: number, level: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The player is currently at score ${score} on level ${level} in a bubble shooter game named "BallBop". Provide a short, exciting, one-sentence pro tip or motivational message that mentions the "BallBop" name and "939PRO" branding.`,
      config: {
        maxOutputTokens: 50,
        temperature: 0.7,
      }
    });
    return response.text || "Keep popping for BallBop glory!";
  } catch (error) {
    console.error("AI tip error:", error);
    return "Precision is the key to BallBop dominance!";
  }
};
