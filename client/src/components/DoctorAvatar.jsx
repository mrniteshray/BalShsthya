import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const DoctorAvatar = ({ state }) => {
  // States: 'idle', 'listening', 'thinking', 'speaking'

  const variants = {
    idle: { scale: 1, y: 0, transition: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } },
    speaking: { scale: 1.02, transition: { duration: 0.3, repeat: Infinity, repeatType: "reverse" } },
    thinking: { rotate: [0, 2, -2, 0], scale: 1.01, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
    listening: { scale: 1.05, y: -2, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const mouthVariants = {
    idle: { scaleY: 0.3, transition: { duration: 0.5 } },
    speaking: { scaleY: [0.3, 1.5, 0.3, 1.2, 0.3], transition: { duration: 0.4, repeat: Infinity, ease: "easeInOut" } },
    thinking: { scaleX: 0.8, scaleY: 0.3 },
    listening: { scaleY: 0.4, scaleX: 1.1 } // Slight smile/attentive
  };

  const eyeVariants = {
    idle: { scaleY: 1, transition: { delay: 3, duration: 0.1, repeat: Infinity, repeatDelay: 3 } }, // Blink
    speaking: { scaleY: 1 },
    thinking: { scaleY: [1, 0.2, 1], transition: { duration: 0.5, repeat: Infinity } }, // Squinting/Thinking
    listening: { scaleY: 1.2 } // Wide eyes
  };

  return (
    <div className="relative w-64 h-64 flex justify-center items-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>

      {/* Avatar SVG */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full z-10 drop-shadow-2xl"
        animate={state}
        variants={variants}
      >
        {/* Doctor Body/Coat */}
        <path d="M40,200 Q100,220 160,200 L160,150 Q100,160 40,150 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M40,200 L40,150 L160,150 L160,200" fill="#f8fafc" />
        {/* Collar */}
        <path d="M70,150 L100,180 L130,150" fill="none" stroke="#CBD5E1" strokeWidth="3" />

        {/* Head */}
        <circle cx="100" cy="90" r="50" fill="#FFDAC1" />

        {/* Hair */}
        <path d="M50,90 Q50,40 100,40 Q150,40 150,90 Q150,70 140,60 Q100,20 60,60 Z" fill="#4B5563" />

        {/* Eyes */}
        <motion.g animate={state} variants={eyeVariants}>
          <circle cx="80" cy="85" r="5" fill="#1F2937" />
          <circle cx="120" cy="85" r="5" fill="#1F2937" />
          {/* Glasses */}
          <circle cx="80" cy="85" r="12" fill="none" stroke="#6EC1E4" strokeWidth="2" />
          <line x1="92" y1="85" x2="108" y2="85" stroke="#6EC1E4" strokeWidth="2" />
          <circle cx="120" cy="85" r="12" fill="none" stroke="#6EC1E4" strokeWidth="2" />
        </motion.g>

        {/* Mouth */}
        <motion.ellipse
          cx="100" cy="110" rx="10" ry="5"
          fill="#BE185D"
          animate={state}
          variants={mouthVariants}
        />

        {/* Stethoscope */}
        <path d="M60,150 Q60,180 80,200" fill="none" stroke="#475569" strokeWidth="3" />
        <path d="M140,150 Q140,180 120,200" fill="none" stroke="#475569" strokeWidth="3" />
        <circle cx="100" cy="200" r="10" fill="#94A3B8" />

      </motion.svg>
      {/* State Badge */}
      <motion.div
        className="absolute -bottom-4 bg-white px-4 py-1 rounded-full shadow-lg text-xs font-semibold text-primary uppercase tracking-wider"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {state}
      </motion.div>
    </div>
  );
};

export default DoctorAvatar;
