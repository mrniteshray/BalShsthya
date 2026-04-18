import { useState, useEffect, useRef } from "react";
import CONFIG from "../config.js";
import { useSelector } from "react-redux"; // Import useSelector
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane, FaTimes, FaPhoneSlash, FaPhone, FaExclamationTriangle, FaCog, FaPlay, FaVolumeMute } from "react-icons/fa";
import { MdChatBubble } from "react-icons/md";

// Helper to calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return "";
  const birthDate = new Date(dob);
  const difference = Date.now() - birthDate.getTime();
  const ageDate = new Date(difference);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// --- ANIMATED DOCTOR COMPONENT ---
const DoctorAvatar = ({ state }) => {
  const variants = {
    idle: { y: [0, -5, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
    speaking: { scale: 1.02, transition: { duration: 0.2, repeat: Infinity, repeatType: "reverse" } },
    thinking: { rotate: [0, 2, -2, 0], transition: { duration: 1, repeat: Infinity } },
    listening: { scale: 1.05, transition: { duration: 0.5 } }
  };

  const mouthVariants = {
    idle: { scaleY: 0.3 },
    speaking: { scaleY: [0.3, 1.2, 0.3], transition: { duration: 0.15, repeat: Infinity } },
    thinking: { scaleY: 0.3 },
    listening: { scaleY: 0.4, scaleX: 1.1 }
  };

  return (
    <div className="relative w-64 h-64 flex justify-center items-center drop-shadow-2xl">
      <div className={`absolute inset-0 rounded-full blur-3xl opacity-40 transition-colors duration-500
            ${state === 'listening' ? 'bg-green-400' : state === 'speaking' ? 'bg-blue-400' : state === 'thinking' ? 'bg-purple-400' : 'bg-blue-200'}
        `}></div>

      <motion.svg viewBox="0 0 200 200" className="w-full h-full z-10" animate={state} variants={variants}>
        <path d="M40,200 Q100,220 160,200 L160,150 Q100,160 40,150 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M40,200 L40,150 L160,150 L160,200" fill="#F1F5F9" />
        <circle cx="100" cy="90" r="50" fill="#FECDD3" />
        <path d="M50,90 Q50,40 100,40 Q150,40 150,90 Q150,60 140,50 Q100,10 60,50 Z" fill="#4B5563" />
        <g>
          <circle cx="80" cy="85" r="5" fill="#1F2937" />
          <circle cx="120" cy="85" r="5" fill="#1F2937" />
          <circle cx="80" cy="85" r="13" fill="none" stroke="#60A5FA" strokeWidth="2.5" />
          <line x1="93" y1="85" x2="107" y2="85" stroke="#60A5FA" strokeWidth="2.5" />
          <circle cx="120" cy="85" r="13" fill="none" stroke="#60A5FA" strokeWidth="2.5" />
        </g>
        <motion.ellipse cx="100" cy="115" rx="10" ry="5" fill="#BE123C" animate={state} variants={mouthVariants} />
        <path d="M60,150 Q60,180 80,200" fill="none" stroke="#475569" strokeWidth="3" />
        <path d="M140,150 Q140,180 120,200" fill="none" stroke="#475569" strokeWidth="3" />
        <circle cx="100" cy="200" r="12" fill="#94A3B8" />
        <circle cx="100" cy="200" r="6" fill="#F8FAFC" />
      </motion.svg>

      <motion.div className="absolute -bottom-6 bg-white/80 backdrop-blur-md px-4 py-1 rounded-full shadow-lg text-xs font-bold text-slate-600 uppercase tracking-widest border border-white/50" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {state === 'idle' ? 'Ready to Help' : state}
      </motion.div>
    </div>
  );
};

// --- MAIN PAGE ---
const CareCoPilot = () => {
  const { user } = useSelector((state) => state.user); // Get API user data
  const [mode, setMode] = useState(null);
  const [language, setLanguage] = useState('en-US');
  const [avatarState, setAvatarState] = useState('idle');

  // Set initial state based on user presence - hide profile modal if user exists
  const [showProfile, setShowProfile] = useState(!user);
  const [hasSubmittedProfile, setHasSubmittedProfile] = useState(!!user);

  const [sentProfileToChat, setSentProfileToChat] = useState(false);
  const [sentProfileToVoice, setSentProfileToVoice] = useState(false);

  // Initialize patient info from user profile if available
  const [patientInfo, setPatientInfo] = useState({
    age: user ? calculateAge(user.dob) : "",
    weight: user?.weight || "",
    concern: "General Consultation" // Default concern since we skipped manual entry
  });

  // Update effect if user loads later (e.g. refresh)
  useEffect(() => {
    if (user) {
      setPatientInfo({
        age: calculateAge(user.dob),
        weight: user.weight || "",
        concern: "General Consultation"
      });
      setHasSubmittedProfile(true);
      setShowProfile(false);
    }
  }, [user]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [techLogs, setTechLogs] = useState([]);

  // Device & Sensitivity State
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [micSensitivity, setMicSensitivity] = useState(2.0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isSilentAlert, setIsSilentAlert] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isCallActive = useRef(false);
  const isAIProcessing = useRef(false);
  const isRecognitionActive = useRef(false);
  const silenceCounter = useRef(0);

  const [debugStatus, setDebugStatus] = useState("Ready");
  const [micVolume, setMicVolume] = useState(0);
  const [lastTranscript, setLastTranscript] = useState("");

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const visualizerActiveRef = useRef(false);
  const utteranceRef = useRef(null);
  const canvasRef = useRef(null);

  const logTech = (msg) => {
    console.log(`[TECH] ${msg}`);
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setTechLogs(prev => [`${time} - ${msg}`, ...prev].slice(0, 5));
  };

  // --- DEVICE LOADING ---
  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(inputs);
        if (inputs.length > 0 && !selectedDeviceId) setSelectedDeviceId(inputs[0].deviceId);
      } catch (e) { logTech("No Mic Access"); }
    };
    loadDevices();

    // Auto-update on hardware change
    navigator.mediaDevices.ondevicechange = loadDevices;

    // Pre-load Speech Synthesis Voices
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      navigator.mediaDevices.ondevicechange = null;
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // --- HOT SWAP LOGIC ---
  useEffect(() => {
    if (isCallActive.current && mode === 'call' && streamRef.current && selectedDeviceId) {
      logTech("Swapping Device...");
      // Stop current
      streamRef.current.getTracks().forEach(track => track.stop());
      stopVisualizer();

      // Request New
      const constraints = {
        audio: { deviceId: { exact: selectedDeviceId }, echoCancellation: true, noiseSuppression: true }
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          streamRef.current = stream;
          startVisualizer();
          logTech("Device Active");
        })
        .catch(e => logTech("Swap Failed"));
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    isCallActive.current = (mode === 'call');
    if (!mode) {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      stopVisualizer();
      setDebugStatus("Ready");
    }
  }, [mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- API HANDLER ---
  const fetchAIResponse = async (text, type = 'chat') => {
    try {
      setDebugStatus(`Thinking...`);
      const BASE_URL = CONFIG.BACKEND_URL;
      const endpoint = type === 'voice' ? `${BASE_URL}/api/carecopilot/voice` : `${BASE_URL}/api/carecopilot/chat`;
      const isNewSession = type === 'voice' ? !sentProfileToVoice : !sentProfileToChat;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, patientInfo: isNewSession ? patientInfo : null, language: language }) // Send language
      });
      if (isNewSession) {
        if (type === 'voice') setSentProfileToVoice(true);
        else setSentProfileToChat(true);
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Server Error: ${res.status}`);
      }
      const data = await res.json();
      return data.reply;
    } catch (e) {
      console.error("AI Fetch Error:", e);
      return `Error: ${e.message}`;
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const userMsg = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText("");
    setAvatarState('thinking');
    const reply = await fetchAIResponse(userMsg, 'chat');
    setAvatarState('speaking');
    setTimeout(() => setAvatarState('idle'), 3000);
    setMessages(prev => [...prev, { role: 'ai', text: reply }]);
  };

  // --- VISUALIZER ENGINE ---
  const stopVisualizer = () => {
    visualizerActiveRef.current = false;
    // Do not close AudioContext immediately to avoid re-creation overhead, 
    // but suspend it to save CPU. Only close on component unmount or deep reset.
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => { });
    }
    setMicVolume(0);
    setIsSilentAlert(false);
  };

  const startVisualizer = async () => {
    if (!streamRef.current || visualizerActiveRef.current) return;
    try {
      // Reuse existing context if available
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') await audioContext.resume();

      // Re-create analyser only if needed (though usually persistent is fine, 
      // but upstream stream changes might require reconnection)
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) { }
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(streamRef.current);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      visualizerActiveRef.current = true;

      const draw = () => {
        if (!visualizerActiveRef.current || !analyserRef.current) return;
        analyser.getByteTimeDomainData(dataArray);

        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 2; ctx.strokeStyle = '#4ade80'; ctx.beginPath();
          const sliceWidth = canvas.width / dataArray.length;
          let x = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();
        }

        let total = 0;
        for (let i = 0; i < dataArray.length; i++) total += Math.abs(dataArray[i] - 128);
        const curVol = (total / dataArray.length) * micSensitivity;
        setMicVolume(curVol);

        // SILENCE DETECTION (Watchdog Pulse)
        if (avatarState === 'listening' && curVol < 1) {
          silenceCounter.current += 1;
          if (silenceCounter.current > 300) setIsSilentAlert(true); // 5 sec
        } else {
          silenceCounter.current = 0;
          setIsSilentAlert(false);
        }

        requestAnimationFrame(draw);
      };
      draw();
    } catch (e) { logTech("Viz Error"); }
  };

  // --- MIC TEST ---
  const runMicTest = () => {
    if (!streamRef.current) return;
    setIsTestingMic(true);
    const recorder = new MediaRecorder(streamRef.current);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
      audio.onended = () => { setIsTestingMic(false); logTech("Tested OK"); };
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 3000);
  };

  // --- VOICE CALL LOGIC ---
  const startCall = () => {
    setMode('call');
    setShowProfile(false);
    isCallActive.current = true;
    setDebugStatus("Powering Mic...");

    const constraints = {
      audio: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        echoCancellation: true, noiseSuppression: true, autoGainControl: true
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        streamRef.current = stream;
        startVisualizer();
        logTech(`Call Started (${language})`);
        const initialMsg = language === 'hi-IN'
          ? "नमस्ते! मैं डॉक्टर केयर हूँ। मैं आपकी क्या मदद कर सकती हूँ?"
          : "Hello! I am Dr. Care. How can I help with your little one today?";

        // Small delay to ensure synthesis is ready
        setTimeout(() => {
          logTech("Greeting...");
          speak(initialMsg);
        }, 800);
      })
      .catch(err => {
        alert("Microphone Error. Check Windows Settings.");
        endCall();
      });
  };

  const endCall = async () => {
    setMode(null);
    isCallActive.current = false;
    isAIProcessing.current = false;
    isRecognitionActive.current = false; // Ensure flag is cleared
    setAvatarState('idle');
    setLastTranscript("");
    stopVisualizer();

    // Explicitly clean up stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    window.speechSynthesis.cancel();

    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent restart loop
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.abort(); } catch (e) { } // aggressive stop
      recognitionRef.current = null;
    }

    setDebugStatus("Call Ended");
    await fetch(`${CONFIG.BACKEND_URL}/api/carecopilot/voice/reset`, { method: "POST" });
  };

  const speak = (text) => {
    setAvatarState('speaking');
    setDebugStatus("Speaking...");
    window.speechSynthesis.cancel();

    // Safety check: if call ended while fetching response
    if (!isCallActive.current) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.lang = language;

    // Unified natural parameters to prevent "breaking"
    utterance.pitch = 1.1;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    const femaleVoiceKeywords = ['female', 'woman', 'samantha', 'victoria', 'zira', 'amy', 'google us english', 'natural', 'kalpana', 'shlok', 'hindi', 'india', 'heera', 'sonia', 'swara'];

    if (language === 'hi-IN') {
      // Priority: High quality female Hindi voices
      selectedVoice = voices.find(v => v.lang.includes('hi') && (v.name.toLowerCase().includes('female') || v.name.includes('Kalpana') || v.name.includes('Heera') || v.name.includes('Sonia') || v.name.includes('Swara')))
        || voices.find(v => v.lang.includes('hi') && v.name.includes('Google'))
        || voices.find(v => v.lang.includes('hi'));
    } else {
      // Priority: High quality natural female voices
      selectedVoice = voices.find(v => v.name.includes('Google US English') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.name.includes('Microsoft Zira'))
        || voices.find(v => v.name.includes('Samantha'))
        || voices.find(v => femaleVoiceKeywords.some(key => v.name.toLowerCase().includes(key)) && v.lang.includes('en'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      logTech(`Voice: ${selectedVoice.name} (${selectedVoice.lang})`); // Enhanced Logging
    } else {
      logTech(`No specific voice found for ${language}, using default.`);
    }

    utterance.onend = () => {
      setDebugStatus("Hearing...");
      isAIProcessing.current = false;
      if (isCallActive.current) startListening();
    };
    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      if (isCallActive.current) startListening();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!isCallActive.current || isAIProcessing.current || isRecognitionActive.current) return;

    // Cleanup previous instance if any (Memory Leak Fix)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) { }
    }

    setAvatarState('listening');
    setDebugStatus("Hearing...");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logTech("Speech API Missing");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Better for turn-based on Windows
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let interimTimeout = null;

    recognition.onstart = () => {
      isRecognitionActive.current = true;
      logTech("Mic Active");
    };

    recognition.onresult = async (event) => {
      if (interimTimeout) clearTimeout(interimTimeout);

      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setLastTranscript(finalTranscript);
        processVoiceInput(finalTranscript, recognition);
      } else if (currentInterim) {
        setLastTranscript(currentInterim);
        interimTimeout = setTimeout(() => {
          if (currentInterim && !isAIProcessing.current) {
            logTech("Auto-Trigger");
            processVoiceInput(currentInterim, recognition);
          }
        }, 2000);
      }
    };

    const processVoiceInput = async (text, rec) => {
      if (!text.trim() || isAIProcessing.current) return;
      logTech(`Heard: ${text.slice(0, 15)}...`);
      setAvatarState('thinking');

      isRecognitionActive.current = false;

      // Cleanup before processing to prevent interference
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try { rec.stop(); } catch (e) { }

      isAIProcessing.current = true;
      const reply = await fetchAIResponse(text, 'voice');
      speak(reply);
    };

    recognition.onerror = (event) => {
      isRecognitionActive.current = false;
      logTech(`Mic Err: ${event.error}`);

      // Don't alert on 'no-speech' or 'aborted', just retry silently
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (isCallActive.current && !isAIProcessing.current) {
          setTimeout(startListening, 300);
        }
        return;
      }

      if (event.error === 'not-allowed') {
        alert("Mic Permission Denied");
        endCall();
      }
    };

    recognition.onend = () => {
      isRecognitionActive.current = false;
      logTech("Mic Off");
      if (isCallActive.current && !isAIProcessing.current) {
        setTimeout(startListening, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      isRecognitionActive.current = false;
      logTech("Start Error");
      // Prevent infinite rapid retry loops
      setTimeout(() => {
        if (isCallActive.current) startListening();
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white py-12 flex flex-col items-center justify-center p-4 overflow-hidden relative font-sans">

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="z-10 text-center mb-8">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">Care Co-Pilot</h1>
        <p className="text-slate-300 text-lg">Pediatric AI Assistant</p>

        {mode === 'call' && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-3xl border border-white/10 flex flex-col items-center gap-3 w-72 shadow-2xl relative overflow-hidden">

              {/* SILENCE ALERT OVERLAY */}
              <AnimatePresence>
                {isSilentAlert && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20">
                    <FaVolumeMute className="text-white mb-2" size={20} />
                    <p className="text-[10px] font-black uppercase text-white leading-tight">No Sound Detected!<br />Is your mic muted in Windows?</p>
                    <button onClick={() => setIsSilentAlert(false)} className="mt-2 text-[9px] bg-white text-red-950 px-2 py-1 rounded-full font-bold">Dismiss</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between w-full text-[10px] font-mono text-green-400 font-black">
                <span className="animate-pulse">{debugStatus.toUpperCase()}</span>
                <span className="text-slate-500 opacity-50">{Math.round(micVolume)}%</span>
              </div>

              <canvas ref={canvasRef} width="240" height="30" className="opacity-40" />

              <div className="text-sm text-white font-medium text-center w-full px-2 min-h-[1.5rem] leading-tight">
                {lastTranscript ? `"${lastTranscript}"` : ""}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2 justify-center">
          <button onClick={() => setLanguage('en-US')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'en-US' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/10 text-white'}`}>ENGLISH</button>
          <button onClick={() => setLanguage('hi-IN')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'hi-IN' ? 'bg-white text-green-600 shadow-lg' : 'bg-white/10 text-white'}`}>HINDI</button>
        </div>
      </motion.div>

      {/* AVATAR */}
      <motion.div layoutId="avatar-container" className="mb-10 z-10"><DoctorAvatar state={avatarState} /></motion.div>

      {/* ACTIONS */}
      <AnimatePresence>
        {!mode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 flex flex-col items-center w-full max-w-2xl px-4">
            <p className="text-2xl font-medium text-slate-200 mb-10 text-center">"How can I help you today?"</p>
            <div className="flex flex-col sm:flex-row gap-6 w-full">
              <button onClick={() => setMode('chat')} className="flex-1 bg-white/60 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-xl hover:bg-white/80 transition-all flex flex-col items-center gap-4 group">
                <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><MdChatBubble size={40} /></div>
                <div className="text-center"><h3 className="text-xl font-bold text-slate-800">AI Chat</h3><p className="text-slate-500 text-sm">Text consultation</p></div>
              </button>
              <button onClick={startCall} className="flex-1 bg-white/60 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-xl hover:bg-white/80 transition-all flex flex-col items-center gap-4 group">
                <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:scale-110 transition-transform"><FaPhone size={40} /></div>
                <div className="text-center"><h3 className="text-xl font-bold text-slate-800">AI Call</h3><p className="text-slate-500 text-sm">Voice Interaction</p></div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SAFETY NOTICE */}
      <motion.div className="mt-16 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md max-w-2xl w-full z-10 text-xs text-slate-400">
        <div className="flex gap-4">
          <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-black text-slate-200 uppercase tracking-widest text-[10px]">Safety Disclaimer</p>
            <p>Informational only. Never give medication to infants under 2 without a doctor's advice. Seek professional care for serious symptoms like respiratory distress.</p>
          </div>
        </div>
      </motion.div>

      {/* CHAT MODAL */}
      <AnimatePresence>
        {mode === 'chat' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[650px]">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center text-white">
                <span className="font-bold flex items-center gap-2"><MdChatBubble /> Consultation</span>
                <button onClick={() => setMode(null)}><FaTimes /></button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-800 border shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t flex gap-3">
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type concern..." className="flex-1 bg-slate-100 px-6 py-4 rounded-2xl outline-none text-slate-900" />
                <button type="submit" className="bg-blue-600 text-white p-4 rounded-2xl"><FaPaperPlane /></button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* END CALL */}
      {mode === 'call' && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={endCall} className="fixed bottom-10 bg-red-600 p-6 rounded-full shadow-2xl text-white active:scale-90 z-50 border-4 border-slate-900">
          <FaPhoneSlash size={24} />
        </motion.button>
      )}

      {/* SPLASH PROFILE */}
      <AnimatePresence>
        {(showProfile && !hasSubmittedProfile) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 flex flex-col gap-8 text-slate-900 shadow-2xl">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black">Patient Profile</h2>
                <p className="text-slate-500 text-sm">Provide child's context</p>
              </div>
              <div className="space-y-4">
                <input type="text" value={patientInfo.age} onChange={e => setPatientInfo({ ...patientInfo, age: e.target.value })} placeholder="Child's Age" className="w-full bg-slate-100 p-5 rounded-2xl outline-none text-slate-900" />
                <input type="text" value={patientInfo.weight} onChange={e => setPatientInfo({ ...patientInfo, weight: e.target.value })} placeholder="Weight" className="w-full bg-slate-100 p-5 rounded-2xl outline-none text-slate-900" />
                <textarea value={patientInfo.concern} onChange={e => setPatientInfo({ ...patientInfo, concern: e.target.value })} placeholder="Health concern..." className="w-full bg-slate-100 p-5 rounded-2xl h-28 resize-none outline-none text-slate-900" />
              </div>
              <button
                onClick={() => { setHasSubmittedProfile(true); setShowProfile(false); }}
                disabled={!patientInfo.age || !patientInfo.concern}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-xl disabled:opacity-20"
              >
                Start Consultation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CareCoPilot;
