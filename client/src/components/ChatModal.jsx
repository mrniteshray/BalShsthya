import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User, Activity } from 'lucide-react';
import axios from 'axios';

const ChatModal = ({ isOpen, onClose, onStateChange }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I am Dr. Care. How can I help with your child's health today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);
    onStateChange('thinking');

    try {
      const response = await axios.post('/api/chat', { message: userMsg });
      const aiMsg = response.data.reply;

      onStateChange('speaking');
      // Simulate reading/speech time briefly before going to idle
      setTimeout(() => onStateChange('idle'), 2000);

      setMessages(prev => [...prev, { role: 'ai', text: aiMsg }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting. Please try again." }]);
      onStateChange('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[600px]"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <div className="bg-primary p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Dr. Care</h2>
                  <p className="text-xs text-white/80">AI Pediatric Assistant</p>
                </div>
              </div>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
                <X size={24} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-white border border-gray-100 shadow-sm text-gray-700 rounded-bl-none'
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about symptoms..."
                  className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-primary transition"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={handleSend}
                  className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
                  disabled={isLoading}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
