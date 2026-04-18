import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mic,
  MicOff,
  Camera,
  VideoOff,
  Phone,
  X,
  RefreshCcw,
  Star,
  Clock,
  Check,
  Video,
  ChevronRight,
  Languages,
} from "lucide-react";
import io from "socket.io-client";
import Peer from "simple-peer";
import appointmentAPI from "../api/appointmentAPI.jsx";
import { toast } from "react-hot-toast";
import CONFIG from "../config.js";

// Initialize socket connection outside component to avoid multiple connections
const socket = io(CONFIG.BACKEND_URL); // Ensure this matches your server URL

const ConsultationPage = () => {
  const { user } = useSelector((state) => state.user);

  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'doctor') {
      navigate('/doctor-dashboard', { replace: true });
    }
  }, [user, navigate]);



  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showBookingSummary, setShowBookingSummary] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // 0: Today, 1: Tomorrow, 2: day after
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Slot booking specific state
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [isConfirmationMinimized, setIsConfirmationMinimized] = useState(false);
  const [notification, setNotification] = useState(null);

  // WebRTC State
  const [me, setMe] = useState("");
  const [activeAppointmentId, setActiveAppointmentId] = useState("");
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  // Debugging state transitions
  useEffect(() => {
    console.log("--- PATIENT STATE CHANGE ---");
    console.log("selectedDoctor:", selectedDoctor?.firstName);
    console.log("showBookingSummary:", showBookingSummary);
    console.log("bookingStatus:", bookingStatus);
    console.log("isBooking:", isBooking);
  }, [selectedDoctor, showBookingSummary, bookingStatus, isBooking]);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  /* ---------------- FETCH DATA ON MOUNT ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingDoctors(true);
        // 1. Fetch Doctors
        const docRes = await appointmentAPI.getDoctors();
        let normalizedDoctors = [];
        if (docRes.success) {
          normalizedDoctors = docRes.data.map(d => {
            let slots = d.availableSlots || ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];
            const normalizedSlots = (Array.isArray(slots))
              ? { 0: slots, 1: slots, 2: slots }
              : slots;

            return {
              ...d,
              id: d._id || d.id,
              firstName: d.firstName || d.firstname || "Doctor",
              lastName: d.lastName || d.lastName || "",
              specialization: d.specialization || "General Physician",
              languages: Array.isArray(d.languages) ? d.languages : ["English"],
              tags: Array.isArray(d.tags) ? d.tags : ["General"],
              availableSlots: normalizedSlots,
              image: d.image || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300"
            };
          });
          setDoctors(normalizedDoctors);
        }

        // 2. Fetch Parent's existing appointments to restore state
        const apptRes = await appointmentAPI.getParentAppointments();
        if (apptRes.success && apptRes.data.length > 0) {
          // Look for most recent Pending or Confirmed/Rescheduled appointment
          const activeAppt = apptRes.data.find(a =>
            ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status)
          );

          if (activeAppt) {
            console.log("Restoring active appointment state:", activeAppt);
            // Find the full doctor object to set as selected
            const doc = normalizedDoctors.find(d =>
              String(d.id) === String(activeAppt.doctor)
            );

            if (doc) {
              setSelectedDoctor(doc);
              setSelectedSlot(activeAppt.timeSlot);

              // Restore selectedDay based on date string
              const dayMap = { "Today": 0, "Tomorrow": 1, "Day After": 2 };
              setSelectedDay(dayMap[activeAppt.date] || 0);

              setBookingStatus(activeAppt.status === 'Confirmed' ? 'accepted' : activeAppt.status.toLowerCase());
              setIsConfirmationMinimized(true); // Don't pop up modal immediately on mount restore
              setShowBookingSummary(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchData();
  }, []);

  /* ---------------- SOCKET EVENTS ---------------- */
  useEffect(() => {
    // Backup: set ID if socket is already connected
    if (socket.connected) {
      setMe(socket.id);
    }
    socket.on("me", (id) => setMe(id));

    // Join a private patient room so confirmation can be sent even after socket ID change
    const patientId = user?._id || user?.id;
    console.log("[Video-Debug] Current Patient ID:", patientId);

    if (patientId) {
      const roomName = `patient_${patientId}`;
      socket.emit("join-room", roomName);
      console.log(`[Video-Debug] Emitted join-room: ${roomName}`);
    }

    const onConnect = () => {
      console.log("[Video-Debug] Socket connected/reconnected:", socket.id);
      if (patientId) {
        const roomName = `patient_${patientId}`;
        socket.emit("join-room", roomName);
        console.log(`[Video-Debug] Re-joining room: ${roomName}`);
      }
    };
    socket.on("connect", onConnect);

    // Cleanup for 'me' listener
    return () => {
      socket.off("me");
      socket.off("connect", onConnect);
    };
  }, [user]);
  useEffect(() => {
    const handleIncomingCall = (data) => {
      console.log("[Video-Debug] received incoming-call event:", data);
      setReceivingCall(true);
      setCaller(data.doctorSocketId);
      setName(data.doctorName);
      setActiveAppointmentId(data.appointmentId);
      
      toast((t) => (
        <div className="flex flex-col gap-2">
           <span className="font-bold">Dr. {data.doctorName} is calling...</span>
           <div className="flex gap-2">
              <button 
                 onClick={() => {
                   console.log("[Video-Debug] Accept clicked for appt:", data.appointmentId);
                   toast.dismiss(t.id);
                   acceptLiveCall(data.appointmentId);
                 }}
                 className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold"
              >
                  Accept
              </button>
              <button 
                 onClick={() => {
                   console.log("[Video-Debug] Decline clicked for appt:", data.appointmentId);
                   toast.dismiss(t.id);
                   rejectLiveCall(data.appointmentId);
                 }}
                 className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold"
              >
                  Decline
              </button>
           </div>
        </div>
      ), { duration: 30000, id: 'incoming-call-toast' });
    };

    socket.on("incoming-call", handleIncomingCall);

    socket.on("call-ended", () => {
        toast("Call ended by doctor.", { icon: 'ℹ️' });
        leaveCall();
    });

    // Webrtc signal listener is setup after call acceptance

    socket.on("slot-confirmation", (data) => {
      console.log("--- PATIENT RECEIVED confirmed status ---", data);
      const slotVal = data.slot || data.timeSlot;
      setBookingStatus(data.status);
      setIsBooking(false);
      setIsConfirmationMinimized(false); // Show the modal when it arrives

      setNotification({
        title: data.status === 'accepted' ? 'Slot Confirmed!' : 'Slot Unavailable',
        message: data.status === 'accepted'
          ? `Dr. ${data.doctorName} has accepted your request for ${slotVal}.`
          : `Dr. ${data.doctorName} is unable to take the ${slotVal} slot. Please try another.`,
        type: data.status === 'accepted' ? 'accepted' : 'error' // Match CSS classes
      });
      // Auto-clear notification after 8 seconds
      setTimeout(() => setNotification(null), 8000);
    });

    socket.on("slot-rescheduled", (data) => {
      console.log("Parent received reschedule:", data);
      setBookingStatus('Rescheduled');
      setIsBooking(false);
      setNotification({
        title: 'Appointment Rescheduled',
        message: `Dr. ${data.doctorName} has rescheduled your appointment to ${data.date} at ${data.slot}.`,
        type: 'accepted' // Using 'accepted' styling for rescheduled
      });
      setTimeout(() => setNotification(null), 8000);
    });

    // Cleanup listeners
    return () => {
      socket.off("me");
      socket.off("incoming-call");
      socket.off("call-ended");
      socket.off("slot-confirmation");
      socket.off("slot-rescheduled");
    };
  }, []);

  /* ---------------- START CAMERA ---------------- */
  const startCamera = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      setIsMuted(false);
      setIsCameraOff(false);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Please allow camera and microphone access.");
    }
  };

  /* ---------------- WEBRTC FUNCTIONS ---------------- */
  const acceptLiveCall = async (appointmentId) => {
      setCallAccepted(true);
      setActiveAppointmentId(appointmentId);
      setIsVideoCallOpen(true);
      
      socket.emit("join-appointment-room", appointmentId);
      
      // Establish listeners BEFORE emitting accept-call to avoid race conditions
      socket.on("webrtc-signal", (signal) => {
          if (connectionRef.current) {
              connectionRef.current.signal(signal);
          }
      });

      await startCamera();
      
      socket.emit("accept-call", { appointmentId });

      const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream || myVideo.current?.srcObject,
          config: {
              iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' }
              ]
          }
      });

      peer.on("signal", (data) => {
          socket.emit("webrtc-signal", {
              appointmentId,
              signal: data
           });
      });

      peer.on("stream", (currentStream) => {
          if (userVideo.current) {
               userVideo.current.srcObject = currentStream;
          }
      });
      
      connectionRef.current = peer;
  };

  const rejectLiveCall = (appointmentId) => {
      socket.emit("reject-call", { appointmentId });
      setReceivingCall(false);
  };

  const leaveCall = () => {
    if (activeAppointmentId) {
        socket.emit("end-call", { appointmentId: activeAppointmentId });
    }
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoCallOpen(false);
    setCallAccepted(false);
    setReceivingCall(false);
    setActiveAppointmentId("");
    callInitiated.current = false;
    socket.off("webrtc-signal");
  };

  /* ---------------- EFFECTS ---------------- */
  const [doctorSocketId, setDoctorSocketId] = useState("");
  const callInitiated = useRef(false);

  useEffect(() => {
    if (isVideoCallOpen) {
      startCamera();
      // Also notify the doctor that patient has joined the room
      if (selectedDoctor) {
        socket.emit("notify-patient-ready", {
          doctorId: selectedDoctor.id || selectedDoctor._id,
          patientName: user?.name
        });
      }
    } else {
      callInitiated.current = false; // Reset for next time
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoCallOpen, facingMode]);

  // Effect to automatically answer the doctor once everything is ready
  useEffect(() => {
    if (receivingCall && isVideoCallOpen && !callAccepted && stream && callerSignal && !callInitiated.current) {
      console.log("--- AUTO-ANSWERING DOCTOR ---", caller);
      // The new architecture doesn't auto-answer with `answerCall` directly,
      // but rather `acceptLiveCall` is triggered by user interaction (toast button).
      // This block might need re-evaluation or removal depending on desired flow.
      // For now, commenting out the `answerCall()` call as it's replaced.
      // answerCall();
      callInitiated.current = true;
    }
  }, [receivingCall, isVideoCallOpen, callAccepted, stream, caller, callerSignal]);

  /* ---------------- CONTROLS ---------------- */
  const toggleMute = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff;
    });
    setIsCameraOff(!isCameraOff);
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /* ---------------- BOOKING FUNCTIONS ---------------- */
  const handleRequestSlot = async (slotToBook) => {
    const targetSlot = slotToBook || selectedSlot;
    if (!targetSlot) {
      alert("Please select a slot first!");
      return;
    }

    setIsBooking(true);
    setBookingStatus('pending');

    try {
      // 1. Save appointment request to Database
      const dateVal = selectedDay === 0 ? "Today" : selectedDay === 1 ? "Tomorrow" : "Day After";
      const res = await appointmentAPI.requestAppointment({
        doctor: selectedDoctor.id.toString(),
        doctorName: selectedDoctor.firstName,
        date: dateVal,
        timeSlot: targetSlot,
        patientName: user?.kidName || "Patient Profile",
        parentName: user?.name || "Parent",
        parentEmail: user?.email || "parent@example.com",
        reason: "General Consultation"
      });

      if (res.success) {
        // 2. Alert Doctor Real-Time with the created record's details
        const newAppt = res.data;
        socket.emit("request-slot", {
          ...newAppt,
          doctor: selectedDoctor.id, // Ensure doctor is passed for filtering
          day: selectedDay,
          parentSocketId: socket.id
        });

        setNotification({
          title: 'Request Sent',
          message: `Asking Dr. ${selectedDoctor.firstName} for the ${targetSlot} slot...`,
          type: 'pending'
        });
      } else {
        throw new Error(res.message || "Failed to request appointment");
      }
      // Auto-clear after 3 seconds for the 'pending' toast
      setTimeout(() => setNotification(prev => prev?.type === 'pending' ? null : prev), 3000);
    } catch (err) {
      toast.error(err?.message || "Failed to request appointment");
      setIsBooking(false);
      setBookingStatus(null);
    }
  };

  const handleSelectAndRequest = (slot) => {
    setSelectedSlot(slot);
    handleRequestSlot(slot);
  };

  const openConsultation = (doctor) => {
    setSelectedDoctor(doctor);
    // Instead of opening video immediately, we check for confirmation
    if (bookingStatus === 'accepted') {
      setIsVideoCallOpen(true);
    } else {
      handleRequestSlot();
    }
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setShowBookingSummary(true);
    setBookingStatus(null); // Reset status for new doctor
  };

  /* ---------------- UI COMPONENTS ---------------- */

  // eslint-disable-next-line react/prop-types
  // eslint-disable-next-line react/prop-types
  const DoctorCard = ({ doctor }) => (
    <div className="bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 mb-4 hover:bg-slate-800/60 transition-all">
      <div className="flex gap-4">
        <img
          src={doctor.image}
          alt={doctor.firstName}
          className="w-20 h-20 rounded-xl object-cover border border-slate-600"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <button
              onClick={() => handleDoctorClick(doctor)}
              className="text-lg font-bold text-white hover:text-purple-400 text-left transition"
            >
              Dr. {doctor.firstName} {doctor.lastName}
              <p className="text-sm font-normal text-gray-400">{doctor.specialization}</p>
            </button>
            <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg text-xs">
              <Star className="w-3 h-3 fill-current" />
              {doctor.rating}
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
            <span className="bg-slate-700/50 px-2 py-0.5 rounded-md">{doctor.experience}+ years exp.</span>
            <span>•</span>
            <span>{doctor.qualifications}</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {doctor.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-slate-700/30 text-white px-2 py-1 rounded-full border border-slate-600/30">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
            <Languages className="w-3 h-3" />
            Speaks: {Array.isArray(doctor.languages) ? doctor.languages.join(", ") : "English"}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-slate-700/30 flex items-center justify-end">
        <button
          onClick={() => handleDoctorClick(doctor)}
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 px-6 py-2 rounded-xl flex items-center gap-2 transition"
        >
          Select Slot
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const ConsultationReadyView = () => (
    <div className="h-full flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-8 md:p-14 text-center shadow-[0_0_80px_rgba(139,92,246,0.15)] relative overflow-hidden group">
        {/* Animated Background Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] group-hover:bg-purple-600/30 transition-all duration-1000" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-all duration-1000" />

        <div className="w-32 h-32 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-10 relative shadow-2xl shadow-purple-500/40">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20" />
          <Video className="w-14 h-14 text-white" />
          <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center">
            <Check className="w-4 h-4 text-white stroke-[4px]" />
          </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Consultation Ready!</h2>
        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed">
          Dr. <span className="text-white font-bold">{selectedDoctor?.firstName} {selectedDoctor?.lastName}</span> is in the room and waiting for you.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl text-left">
            <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-black block mb-2 text-center">Time Slot</span>
            <span className="text-white font-black text-xl block text-center italic">{selectedSlot}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl text-left">
            <span className="text-[10px] uppercase tracking-[0.2em] text-green-400 font-black block mb-2 text-center">Room Status</span>
            <span className="flex items-center justify-center gap-2 text-white font-black text-xl italic leading-none">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              LIVE
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => openConsultation(selectedDoctor)}
            className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-3xl font-black text-2xl shadow-[0_20px_40px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-4 group"
          >
            <Video className="w-8 h-8 group-hover:scale-110 transition" />
            JOIN CONSULTATION
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsConfirmationMinimized(true)}
              className="py-4 bg-slate-800/60 hover:bg-slate-700/80 text-white/70 hover:text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> View Slots
            </button>
            <button
              onClick={() => { setBookingStatus(null); setSelectedSlot(null); setShowBookingSummary(false); }}
              className="py-4 bg-red-500/5 hover:bg-red-500/10 text-red-400/70 hover:text-red-400 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all border border-red-500/10 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const BookingSummaryView = () => (
    <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 h-full flex flex-col overflow-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-white">Consultation Summary</h2>
        <button onClick={() => setShowBookingSummary(false)} className="p-2 hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800 rounded-full transition">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Doctor Brief Info */}
      <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <img src={selectedDoctor.image} className="w-16 h-16 rounded-xl object-cover" />
          <div>
            <h3 className="text-lg font-bold text-white">Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</h3>
            <p className="text-sm text-purple-400">{selectedDoctor.specialization}</p>
            <p className="text-xs text-gray-400 mt-1">{selectedDoctor.experience || 0} years Exp | Speaks: {Array.isArray(selectedDoctor.languages) ? selectedDoctor.languages[0] : "English"}</p>
          </div>
        </div>
      </div>

      {/* Slots Section */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Select your preferred slot</h4>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setSelectedDay(0)}
            className={`flex-1 py-3 rounded-xl text-center transition ${selectedDay === 0 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
          >
            <span className="block text-xs uppercase opacity-70">Today</span>
            <span className="text-lg font-bold">{new Date().getDate()}</span>
          </button>
          <button
            onClick={() => setSelectedDay(1)}
            className={`flex-1 py-3 rounded-xl text-center transition ${selectedDay === 1 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
          >
            <span className="block text-xs uppercase opacity-70">Tomorrow</span>
            <span className="text-lg font-bold">{new Date(Date.now() + 86400000).getDate()}</span>
          </button>
          <button
            onClick={() => setSelectedDay(2)}
            className={`flex-1 py-3 rounded-xl text-center transition ${selectedDay === 2 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
          >
            <span className="block text-xs uppercase opacity-70">Day After</span>
            <span className="text-lg font-bold">{new Date(Date.now() + 86400000 * 2).getDate()}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {selectedDoctor.availableSlots[selectedDay].map((slot) => (
            <button
              key={slot}
              disabled={isBooking}
              onClick={() => handleSelectAndRequest(slot)}
              className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${isBooking && selectedSlot === slot ? "bg-purple-500/10 border-purple-500 text-purple-400 animate-pulse" :
                selectedSlot === slot && bookingStatus === 'accepted' ? "bg-purple-500/20 border-purple-500 text-purple-400" :
                  selectedSlot === slot ? "bg-purple-600 border-purple-500 text-white" :
                    "bg-slate-800 border-slate-700/50 text-gray-400 hover:border-slate-500"
                } ${isBooking ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selection - Simplified to only Video */}
      <div className="mb-8 ">
        <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Consultation Mode</h4>
        <div className="flex gap-4">
          <div
            className="flex-1 bg-slate-800/40 backdrop-blur-md border-purple-500 border-2 p-4 rounded-2xl flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-white font-medium">Video Call (Standard)</span>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {bookingStatus === 'accepted' ? (
        <div className="flex flex-col gap-3 mt-auto">
          <button
            onClick={() => setIsConfirmationMinimized(false)}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all flex items-center justify-center gap-3"
          >
            <Check className="w-5 h-5" /> Back to Ready Screen
          </button>
          <button
            onClick={() => openConsultation(selectedDoctor)}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Video className="w-6 h-6" />
            Join Call
          </button>
        </div>
      ) : isBooking ? (
        <div className="mt-auto w-full py-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border-white/10/80 dark:bg-slate-800/50 border border-slate-700/50 text-gray-400 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-purple-500 rounded-full animate-spin" />
          Waiting for Doctor Confirmation...
        </div>
      ) : (
        <div className="mt-auto text-center text-sm text-gray-500 italic p-4 bg-purple-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-700/50">
          Select a slot to check doctor availability
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white">
      {/* Booking Notification (Top Center) */}
      {notification && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[200] p-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 w-[90%] max-w-md ${notification.type === 'accepted' || notification.type === 'Rescheduled' ? 'bg-purple-950/90 border-purple-500 text-purple-100' :
          notification.type === 'pending' ? 'bg-slate-900/95 border-purple-500 text-purple-100' :
            'bg-red-950/90 border-red-500 text-red-100'
          }`}>
          <div className={`p-2 rounded-full ${notification.type === 'accepted' ? 'bg-purple-500/20' :
            notification.type === 'pending' ? 'bg-purple-500/20' :
              'bg-red-500/20'
            }`}>
            {notification.type === 'accepted' ? <Star className="w-6 h-6 text-purple-400" /> :
              notification.type === 'pending' ? <Clock className="w-6 h-6 text-purple-400" /> :
                <X className="w-6 h-6 text-red-400" />}
          </div>
          <div>
            <h4 className="font-bold">{notification.title}</h4>
            <p className="text-sm opacity-90">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-auto opacity-50 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Premium Success Modal */}
      {bookingStatus === 'accepted' && !isConfirmationMinimized && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-slate-900/40 backdrop-blur-md border border-purple-500/30 w-full max-w-md rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping opacity-20" />
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40">
                <Check className="w-10 h-10 text-white stroke-[4px]" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-3">Slot Confirmed!</h2>
            <p className="text-gray-400 text-lg mb-8">
              Dr. <span className="text-purple-400 font-bold">{selectedDoctor?.firstName}</span> is ready for your consultation at <span className="text-white font-bold">{selectedSlot}</span>.
            </p>

            <button
              onClick={() => openConsultation(selectedDoctor)}
              className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 rounded-2xl font-black text-xl shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <Video className="w-7 h-7" />
              START NOW
            </button>

            <button
              onClick={() => { setIsConfirmationMinimized(true); }}
              className="mt-4 text-gray-500 hover:text-gray-300 font-medium transition"
            >
              Close and wait
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar (Lists/Info) */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-950/50 p-6 border-r border-slate-800/50 flex flex-col">
        <div className="flex-1 overflow-auto pr-1 purple-scrollbar">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 px-1 border-b border-purple-500/30 pb-3 flex items-center justify-between">
            <span>Doctors</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">{doctors.length}</span>
          </h3>

          {loadingDoctors ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Searching Dr...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">No doctors available</p>
            </div>
          ) : (
            doctors.map(doc => {
              const isActive = selectedDoctor?.id === doc.id || selectedDoctor?._id === doc._id;
              return (
                <div
                  key={doc.id || doc._id}
                  className={`mb-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 active:scale-[0.98] ${isActive
                    ? "bg-purple-600 border-purple-400 shadow-xl shadow-purple-500/30 scale-[1.02]"
                    : "bg-white dark:bg-slate-800/40 border-transparent hover:border-purple-500/50 dark:hover:bg-slate-800/60"
                    }`}
                  onClick={() => handleDoctorClick(doc)}
                >
                  <div className="flex gap-4">
                    <img src={doc.image} className="w-12 h-12 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-base font-black truncate ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}>
                        Dr. {doc.firstName} {doc.lastName}
                      </h4>
                      <p className={`text-xs font-bold truncate mt-0.5 ${isActive ? "text-purple-200" : "text-purple-600 dark:text-purple-400"}`}>
                        {doc.specialization}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 relative">
        {bookingStatus === 'accepted' && !isConfirmationMinimized ? (
          <ConsultationReadyView />
        ) : !showBookingSummary ? (
          <div className="h-full flex flex-col">
            <div className="mb-8 mt-4">
              <h1 className="text-3xl font-bold text-white">Consult Top Doctors</h1>
              <p className="text-gray-400 mt-2">Book an appointment and get expert medical advice from the comfort of your home.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
              {doctors.map((doc) => (
                <DoctorCard key={doc.id} doctor={doc} />
              ))}
            </div>

            {receivingCall && !callAccepted && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border-2 border-green-500 p-6 rounded-3xl shadow-2xl flex items-center gap-6 z-[60] animate-bounce">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{name}</h3>
                  <p className="text-xs text-gray-400">is calling you for a consultation...</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={answerCall} className="px-6 py-2 bg-green-500 text-white rounded-full font-bold hover:bg-green-600">Answer</button>
                  <button onClick={leaveCall} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white dark:hover:text-white"><X /></button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full max-w-4xl mx-auto">
            <BookingSummaryView />
          </div>
        )}

        {/* Video Call Overlay */}
        {isVideoCallOpen && (
          <div className="fixed inset-0 bg-purple-50/50 dark:bg-slate-950 z-[100] flex flex-col">
            <div className="flex justify-between items-center p-6 bg-purple-50/50 dark:bg-slate-900/50 backdrop-blur border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">
                    Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}
                  </h3>
                  <p className="text-purple-400 text-[10px] uppercase font-bold tracking-widest">
                    {callAccepted && !callEnded ? "Live Consultation" : "Establishing Connection..."}
                  </p>
                </div>
              </div>
              <button
                onClick={leaveCall}
                className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white dark:hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden bg-slate-900/40 backdrop-blur-md">
              {callAccepted && !callEnded ? (
                <video
                  playsInline
                  ref={userVideo}
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                  <p className="font-medium text-white">{receivingCall ? "Accepting Incoming Request..." : "Connecting to Doctor..."}</p>
                </div>
              )}

              {stream && (
                <div className="absolute bottom-8 right-8 w-48 lg:w-64 aspect-[3/4] rounded-2xl border-4 border-white/10 shadow-2xl overflow-hidden z-10">
                  <video
                    ref={myVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} `}
                  />
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-white font-bold">YOU</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center items-center gap-6 p-10 bg-purple-50/50 dark:bg-slate-950 border-t border-slate-900">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${isMuted ? "bg-red-500 text-white" : "bg-slate-800 text-gray-400 hover:bg-slate-700"} `}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </button>

              <button
                onClick={leaveCall}
                className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-600/20 active:scale-95 transition"
              >
                <Phone className="rotate-[135deg]" />
              </button>

              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${isCameraOff ? "bg-red-500 text-white" : "bg-slate-800 text-gray-400 hover:bg-slate-700"} `}
              >
                {isCameraOff ? <VideoOff /> : <Camera />}
              </button>

              <button
                onClick={flipCamera}
                className="w-14 h-14 bg-slate-800/40 backdrop-blur-md text-gray-400 rounded-2xl flex items-center justify-center hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-700 transition"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationPage;
