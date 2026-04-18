import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";

let chatHistory = null;
let voiceHistory = null;

const getSystemInstruction = (patientInfo, language = "en-US") => {
  return `
You are Doctor Care, a highly empathetic and warm AI Pediatric Assistant.

${patientInfo ? `
Child's Age: ${patientInfo.age}
Weight: ${patientInfo.weight || "not provided"}
Concern: ${patientInfo.concern}
` : ""}

Respond in ${language === "hi-IN" ? "Hindi (Devanagari)" : "English"}.
Keep response 1–2 short sentences only.
No markdown.
No medicines.
`;
};

// =============================
// CHAT FUNCTION
// =============================
export const handleChat = async ({ message, patientInfo, language }) => {

  console.log("🔹 Chat Request Received");
  console.log("🔹 API Key Present:", !!process.env.GEMINI_API_KEY);
  console.log("🔹 Model:", MODEL_NAME);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Server Error: GEMINI_API_KEY is missing in .env");
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: getSystemInstruction(patientInfo, language),
  });

  if (patientInfo || !chatHistory) {
    chatHistory = [];
  }

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(message);

  const reply = result.response.text().replace(/\*+/g, "");

  chatHistory.push({ role: "user", parts: [{ text: message }] });
  chatHistory.push({ role: "model", parts: [{ text: reply }] });

  return reply;
};

// =============================
// VOICE FUNCTION
// =============================
export const handleVoice = async ({ message, patientInfo, language }) => {

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: getSystemInstruction(patientInfo, language),
  });

  if (patientInfo || !voiceHistory) {
    voiceHistory = [];
  }

  const chat = model.startChat({ history: voiceHistory });
  const result = await chat.sendMessage(message);

  const reply = result.response.text().replace(/\*+/g, "");

  voiceHistory.push({ role: "user", parts: [{ text: message }] });
  voiceHistory.push({ role: "model", parts: [{ text: reply }] });

  return reply;
};

export const resetVoiceSession = () => {
  voiceHistory = null;
};
