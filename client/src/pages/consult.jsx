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
  FileText,
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
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null); // Keep for current booking session
  const [activeAppointments, setActiveAppointments] = useState([]); // List for all active bookings
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
  const [pastAppointments, setPastAppointments] = useState([]);

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
              setShowBookingSummary(true);
            }
          }

          // Store active appointments for the horizontal list
          const active = apptRes.data.filter(a => ['pending', 'accepted', 'Confirmed'].includes(a.status));
          setActiveAppointments(active);

          // 3. Store completed appointments for Medical History
          const completed = apptRes.data.filter(a => a.status === 'Completed');
          setPastAppointments(completed);
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
                    answerCall(data.appointmentId);
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

      setNotification({
        title: data.status === 'accepted' ? 'Slot Confirmed!' : 'Slot Unavailable',
        message: data.status === 'accepted'
          ? `Dr. {data.doctorName} has accepted your request for ${slotVal}.`
          : `Dr. {data.doctorName} is unable to take the ${slotVal} slot. Please try another.`,
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
        message: `Dr. {data.doctorName} has rescheduled your appointment to ${data.date} at ${data.slot}.`,
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
      return currentStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Please allow camera and microphone access.");
      return null;
    }
  };

  /* ---------------- WEBRTC FUNCTIONS ---------------- */
  const answerCall = async (id) => {
      const apptId = id || activeAppointmentId;
      if (!apptId) {
          console.error("[Video-Debug] No active appointment ID to answer.");
          return;
      }

      // If we got an ID but state isn't set yet, sync it
      if (id) setActiveAppointmentId(id);

      // 1. Start Camera and await it FIRST
      const currentStream = await startCamera();
      if (!currentStream) return;

      // 2. Immediately set states to open UI
      setReceivingCall(false);
      setCallAccepted(true);
      setIsVideoCallOpen(true);
      
      console.log("[Video-Debug] Answering call with active stream for appt:", apptId);
      socket.emit("join-appointment-room", apptId);
      
      // 3. Create Peer instance using the DIRECT stream
      const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: currentStream,
          config: {
              iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' }
              ]
          }
      });

      // 4. Setup signaling listener for THIS specific peer session
      socket.off("webrtc-signal"); // Clear old
      socket.on("webrtc-signal", (signal) => {
          console.log("[Video-Debug] Received signal for peer:", signal.type || "ice-candidate");
          peer.signal(signal);
      });

      peer.on("signal", (data) => {
          console.log("[Video-Debug] Peer generated answer/signal");
          socket.emit("webrtc-signal", {
              appointmentId: apptId,
              signal: data
           });
      });

      peer.on("stream", (currentStream) => {
          console.log("[Video-Debug] Received remote stream successfully");
          if (userVideo.current) {
               userVideo.current.srcObject = currentStream;
          }
      });

      peer.on("error", (err) => {
          console.error("[Video-Debug] Peer error:", err);
          toast.error("Video connection error.");
      });
      
      connectionRef.current = peer;

      // 5. Finally, notify doctor we are ready (this triggers doctor's offer)
      socket.emit("accept-call", { appointmentId: apptId });
  };

  const rejectLiveCall = (appointmentId) => {
      socket.emit("reject-call", { appointmentId: appointmentId || activeAppointmentId });
      setReceivingCall(false);
      toast.dismiss('incoming-call-toast');
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
  const callInitiated = useRef(false);

  // Fix: Ensure local stream is attached when modal opens or stream starts
  useEffect(() => {
    if (stream && myVideo.current) {
        myVideo.current.srcObject = stream;
    }
  }, [stream, isVideoCallOpen]);

  useEffect(() => {
    if (isVideoCallOpen) {
      // Notify the doctor that patient has joined the room
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
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setShowConfirmModal(true);
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    
    setShowConfirmModal(false);
    setBookingStatus("pending");
    setIsBooking(true);
    
    try {
      const dates = ["Today", "Tomorrow", "Day After"];
      const res = await appointmentAPI.requestAppointment({
        doctor: selectedDoctor.id || selectedDoctor._id,
        doctorName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        timeSlot: selectedSlot,
        date: dates[selectedDay]
      });
      
      setActiveAppointmentId(res.appointmentId);
      toast.success("Consultation Request Sent!");
      
      // Refresh active list
      const apptRes = await appointmentAPI.getParentAppointments();
      setActiveAppointments(apptRes.data.filter(a => ['pending', 'accepted', 'Confirmed'].includes(a.status)));
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to book slot");
      setBookingStatus(null);
      setSelectedSlot(null);
    } finally {
      setIsBooking(false);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await appointmentAPI.deleteAppointment(id);
      toast.success("Appointment cancelled");
      setActiveAppointments(prev => prev.filter(a => a._id !== id));
      socket.emit("appointment-cancelled", { appointmentId: id });
    } catch (err) {
      toast.error("Failed to cancel");
    }
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setShowBookingSummary(true);
    setBookingStatus(null); // Reset status for new doctor
  };

  /* ---------------- UI COMPONENTS ---------------- */

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
              disabled={isBooking || bookingStatus === 'accepted'}
              onClick={() => handleSelectSlot(slot)}
              className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${isBooking && selectedSlot === slot ? "bg-purple-500/10 border-purple-500 text-purple-400 animate-pulse" :
                selectedSlot === slot && bookingStatus === 'accepted' ? "bg-green-500/20 border-green-500 text-green-400" :
                  selectedSlot === slot ? "bg-purple-600 border-purple-400 text-white" :
                    "bg-slate-800 border-slate-700/50 text-gray-400 hover:border-slate-500"
                } ${isBooking || bookingStatus === 'accepted' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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

      {/* Action Button / Success State */}
      {bookingStatus === 'accepted' ? (
        <div className="flex flex-col gap-4 mt-auto bg-green-500/10 border border-green-500/20 p-6 rounded-[2rem] animate-in slide-in-from-bottom-5">
           <div className="flex items-center gap-3 text-green-400 mb-2">
              <Check className="w-6 h-6" />
              <h4 className="font-black uppercase tracking-widest text-sm">Appointment Confirmed</h4>
           </div>
           <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Your appointment with <span className="text-white font-bold">Dr. {selectedDoctor.firstName}</span> is locked for <span className="text-white font-bold">{selectedSlot}</span> (Tomorrow).
           </p>
           <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between text-[11px] uppercase tracking-wider">
                <span className="text-gray-500">Appt ID</span>
                <span className="text-white font-mono">{activeAppointmentId || "N/A"}</span>
              </div>
              <div className="flex justify-between text-[11px] uppercase tracking-wider">
                <span className="text-gray-500">Status</span>
                <span className="text-green-500 font-bold">LIVE ON STANDBY</span>
              </div>
           </div>
           <p className="text-[10px] text-gray-500 italic mt-2">
              The doctor will initiate the video call at your scheduled time. Please stay on this page.
           </p>
        </div>
      ) : bookingStatus === 'pending' ? (
         <div className="mt-auto bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-[2rem] flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4" />
            <h4 className="text-yellow-500 font-black uppercase tracking-widest text-xs mb-1">Request Sent</h4>
            <p className="text-gray-400 text-xs text-center">Waiting for Doctor &quot;{selectedDoctor.firstName}&quot; to confirm your slot...</p>
         </div>
      ) : (
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-gray-500 italic">Select a slot above and confirm your booking.</p>
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
      <div className="flex-1 p-4 md:p-8 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          
          {/* TOP SECTION: ACTIVE APPOINTMENTS (Horizontal List) */}
          {activeAppointments.length > 0 && (
            <div className="animate-in slide-in-from-top-10 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-purple-400">Your Active Consultations</h3>
                <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 font-black">
                  {activeAppointments.length} ACTIVE
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
                {activeAppointments.map(appt => (
                  <div key={appt._id} className="min-w-[300px] bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] relative group border-l-4 border-l-purple-500 shadow-xl">
                    <button 
                      onClick={() => cancelAppointment(appt._id)}
                      className="absolute top-4 right-4 p-1.5 bg-red-500/10 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500 hover:text-white"
                      title="Cancel Appointment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Video className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">Dr. {appt.doctorName || "Psychiatrist"}</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{appt.date} • {appt.timeSlot}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${appt.status === 'accepted' || appt.status === 'Confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {appt.status === 'accepted' || appt.status === 'Confirmed' ? 'Confirmed • Live' : 'Pending'}
                      </span>
                      {appt.status === 'accepted' && (
                        <div className="flex items-center gap-1.5 text-[9px] text-green-500 font-bold animate-pulse">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          STANDBY
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN SECTION: SEARCH & BOOKING */}
          {showBookingSummary ? (
            <BookingSummaryView />
          ) : (
            <div className="flex flex-col gap-8">
              <div className="max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Consult Top Doctors</h1>
                <p className="text-gray-400 mt-3 text-lg leading-relaxed">Book a new appointment and get expert medical advice instantly.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {doctors.map((doc) => (
                  <DoctorCard key={doc.id} doctor={doc} />
                ))}
              </div>
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-[2.5rem] mt-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Your Medical Records</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastAppointments.map(app => (
                    <div key={app._id} className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-black text-purple-400 tracking-[0.2em] mb-1">{app.date}</p>
                          <h4 className="text-white font-bold italic">Dr. {app.doctorName || "Nitesh Ray"}</h4>
                        </div>
                        <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 font-black">COMPLETED</span>
                      </div>
                      
                      <div className="space-y-3">
                        {app.diagnosis && (
                          <div>
                            <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Diagnosis</p>
                            <p className="text-sm text-white/90 font-medium leading-tight">{app.diagnosis}</p>
                          </div>
                        )}
                        {app.prescriptions && (
                          <div>
                            <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Prescriptions</p>
                            <p className="text-sm text-purple-200 font-bold whitespace-pre-line leading-tight">{app.prescriptions}</p>
                          </div>
                        )}
                        {app.notes && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Advice</p>
                            <p className="text-xs text-white/60 italic leading-snug">&quot;{app.notes}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && selectedSlot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                   <Clock className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Confirm Booking</h3>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                  Confirm appointment with <span className="text-white font-bold">Dr. {selectedDoctor.firstName}</span> for:
                  <br />
                  <span className="text-purple-400 font-bold block mt-2 text-lg">
                    {["Today", "Tomorrow", "Day After"][selectedDay]}, {selectedSlot}
                  </span>
                </p>
                
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={handleBooking}
                     className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-lg transition shadow-lg shadow-purple-500/20"
                   >
                     Confirm Booking
                   </button>
                   <button 
                     onClick={() => setShowConfirmModal(false)}
                     className="w-full py-3 text-gray-500 font-bold hover:text-white transition"
                   >
                     Cancel
                   </button>
                </div>
             </div>
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
