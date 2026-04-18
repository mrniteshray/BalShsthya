import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, PhoneOff, Waveform } from 'lucide-react';
import axios from 'axios';

const CallPanel = ({ onEndCall, onStateChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      onStateChange('listening');
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart happens in processLogic usually, but here we restart after AI speaks
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleVoiceInput(text);
    };

    recognitionRef.current = recognition;

    // Start immediately with greeting
    speak("Hello, I am your AI pediatrician. Please tell me your concern.");

    return () => {
      window.speechSynthesis.cancel();
      recognition.stop();
    };
  }, []);

  const handleVoiceInput = async (text) => {
    onStateChange('thinking');
    try {
      const response = await axios.post('/api/voice', { message: text });
      const reply = response.data.reply;
      speak(reply);
    } catch (error) {
      console.error(error);
      speak("I'm sorry, I'm having trouble connecting right now.");
    }
  };

  const speak = (text) => {
    onStateChange('speaking');
    const utterance = new SpeechSynthesisUtterance(text);

    // Optional: Select a specific voice if available
    const voices = window.speechSynthesis.getVoices();
    // Try to find a female/soft voice
    const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      onStateChange('listening');
      // Restart listening loop
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.log("Recognition already started or error: ", e);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-8 flex flex-col items-center z-40"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
    >
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Voice Call with Dr. Care</h3>

      {/* Visualizer */}
      <div className="h-24 w-full flex items-center justify-center gap-1 mb-8">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <motion.div
            key={i}
            className="w-2 bg-primary rounded-full"
            animate={{
              height: isListening ? [20, 50, 20] : 10,
              opacity: isListening ? 1 : 0.5
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="text-center mb-8 h-12 text-gray-500 font-medium">
        {transcript || (isListening ? "Listening..." : "Speaking...")}
      </div>

      <button
        onClick={onEndCall}
        className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full flex items-center gap-3 font-semibold shadow-xl transition transform hover:scale-105"
      >
        <PhoneOff size={24} />
        Stop Call
      </button>

    </motion.div>
  );
};

export default CallPanel;
