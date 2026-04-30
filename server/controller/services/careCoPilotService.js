import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";

let chatHistory = null;
let voiceHistory = null;

const getSystemInstruction = (patientInfo, language = "en-US") => {
  return `
You are Doctor Care, a highly empathetic, practical, and helpful AI Pediatric Assistant.
When a parent describes a symptom (like fever, cough, stomach ache), you MUST provide:
1. Immediate comforting words.
2. Practical home remedies, safe food suggestions, and general care advice to help the child until a doctor is available.
3. STRICTLY DO NOT prescribe or suggest any medical drugs or medications.
4. Advise them to consult a doctor if the condition persists or worsens.

${patientInfo ? `
Child's Age: ${patientInfo.age}
Weight: ${patientInfo.weight || "not provided"}
Concern: ${patientInfo.concern}
` : ""}

Respond in ${language === "hi-IN" ? "Hindi (Devanagari)" : "English"}.
DO NOT use any asterisks (*), bolding, or markdown formatting at all. Use plain text, simple line breaks, or numbered lists without markdown.
Keep the response engaging, well-structured, and concise (around 3 to 5 short sentences max). Do not give long, boring paragraphs.
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

  if (patientInfo || !chatHistory) {
    chatHistory = [];
  }

  let reply;
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: getSystemInstruction(patientInfo, language),
    });
    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    reply = result.response.text().replace(/\*+/g, "");
  } catch (error) {
    console.error("Primary model error:", error.message);
    try {
      console.log("Falling back to gemini-flash-latest...");
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: getSystemInstruction(patientInfo, language),
      });
      const chat = fallbackModel.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      reply = result.response.text().replace(/\*+/g, "");
    } catch (fallbackError) {
      console.error("Fallback model error:", fallbackError.message);
      reply = language === "hi-IN" 
        ? "क्षमा करें, मेरी सेवाएं अभी बहुत व्यस्त हैं। कृपया कुछ समय बाद पुनः प्रयास करें या आपात स्थिति में तुरंत डॉक्टर से संपर्क करें।" 
        : "I apologize, but I am currently experiencing unusually high demand. Please try again in a few minutes, or consult a doctor immediately if this is an emergency.";
    }
  }

  chatHistory.push({ role: "user", parts: [{ text: message }] });
  chatHistory.push({ role: "model", parts: [{ text: reply }] });

  return reply;
};

// =============================
// VOICE FUNCTION
// =============================
export const handleVoice = async ({ message, patientInfo, language }) => {

  if (patientInfo || !voiceHistory) {
    voiceHistory = [];
  }

  let reply;
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: getSystemInstruction(patientInfo, language),
    });
    const chat = model.startChat({ history: voiceHistory });
    const result = await chat.sendMessage(message);
    reply = result.response.text().replace(/\*+/g, "");
  } catch (error) {
    console.error("Primary model error (voice):", error.message);
    try {
      console.log("Falling back to gemini-flash-latest...");
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: getSystemInstruction(patientInfo, language),
      });
      const chat = fallbackModel.startChat({ history: voiceHistory });
      const result = await chat.sendMessage(message);
      reply = result.response.text().replace(/\*+/g, "");
    } catch (fallbackError) {
      console.error("Fallback model error (voice):", fallbackError.message);
      reply = language === "hi-IN" 
        ? "क्षमा करें, मैं अभी व्यस्त हूँ। कृपया थोड़ी देर बाद फिर कोशिश करें।" 
        : "I apologize, but I am currently experiencing high demand. Please try again in a little while.";
    }
  }

  voiceHistory.push({ role: "user", parts: [{ text: message }] });
  voiceHistory.push({ role: "model", parts: [{ text: reply }] });

  return reply;
};

export const resetVoiceSession = () => {
  voiceHistory = null;
};
