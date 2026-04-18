import {
    handleChat,
    handleVoice,
    resetVoiceSession,
} from "./services/careCoPilotService.js";

export const chat = async (req, res) => {
    try {
        const reply = await handleChat(req.body);
        res.json({ success: true, reply });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const voice = async (req, res) => {
    try {
        const reply = await handleVoice(req.body);
        res.json({ success: true, reply });
    } catch (err) {
        console.error("Voice error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const resetVoice = (req, res) => {
    resetVoiceSession();
    res.json({ success: true });
};
