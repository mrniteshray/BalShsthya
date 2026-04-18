import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
    Users,
    Clock,
    CalendarCheck,
    History,
    LogOut,
    CheckCircle,
    XCircle,
    Video,
    FileText,
    X,
    Mic,
    MicOff,
    Camera,
    VideoOff,
    User,
    Phone,
    PhoneOff,
    Save
} from 'lucide-react';
import appointmentAPI from '../api/appointmentAPI.jsx';
import { toast } from 'react-hot-toast';
import io from "socket.io-client";
import Peer from "simple-peer";
import CONFIG from "../config.js";

// Use same socket connection as consult.jsx to ensure they can talk to each other
const socket = io(CONFIG.BACKEND_URL);

const DoctorDashboard = () => {
    const { user } = useSelector((state) => state.user);
    const [activeTab, setActiveTab] = useState('overview');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRequest, setActiveRequest] = useState(null);

    // Modals specific state
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rescheduleSlot, setRescheduleSlot] = useState("");
    const [rescheduleDate, setRescheduleDate] = useState("");

    // Video room state
    const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(true);
    const [consultNotes, setConsultNotes] = useState({ diagnosis: '', prescriptions: '', notes: '' });

    // WebRTC State (Copied from consult.jsx logic mapping to Doctor Side)
    const [me, setMe] = useState("");
    const [idToCall, setIdToCall] = useState("");
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [parentName, setParentName] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    // Fix: Ensure local stream is attached when modal opens or stream starts
    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream, isVideoCallOpen]);

    const calculateAge = (dobString) => {
        if (!dobString) return "N/A";
        try {
            const dob = new Date(dobString);
            if (isNaN(dob.getTime())) return dobString;
            const diff = Date.now() - dob.getTime();
            const ageDate = new Date(diff);
            const years = Math.abs(ageDate.getUTCFullYear() - 1970);
            const months = ageDate.getUTCMonth();
            if (years >= 1) return `${years}y ${months}m`;
            return `${months} months`;
        } catch (e) { return dobString; }
    };

    const timeToMinutes = (timeString) => {
        if (!timeString) return 0;
        const [time, period] = timeString.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };


    /* ---------------- FETCH APPOINTMENTS ---------------- */
    useEffect(() => {
        fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            // Priority: use .id from sign-in payload, fallback to ._id if synced from other sources
            const docId = user?.id || user?._id;
            const res = await appointmentAPI.getDoctorAppointments(docId || "1");
            if (res.success) {
                // Shim: Ensure patientName exists for old records during migration
                const normalizedData = res.data.map(app => ({
                    ...app,
                    patientName: app.patientName || app.childName || "Patient Profile"
                }));
                setAppointments(normalizedData);
            }
        } // eslint-disable-next-line no-unused-vars
        catch (err) {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };


    /* ---------------- WEB SOCKETS ---------------- */
    // Use a ref for user to avoid re-attaching listeners on every user change
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        // Backup: set ID if socket is already connected
        if (socket.connected) {
            setMe(socket.id);
        }

        socket.on("me", (id) => {
            console.log("SOCKET: Connected with ID:", id);
            setMe(id);
        });

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setParentName(data.name);
            setCallerSignal(data.signal);
            toast(`Incoming call for patient consultation...`);
        });

        socket.on("incoming-slot-request", (data) => {
            console.log("--- DASHBOARD RECEIVED SLOT REQUEST ---");
            console.log("Request Data:", data);

            const currentDoctorId = userRef.current?.id || userRef.current?._id;
            const targetDoctorId = data.doctor || data.doctorId;
            console.log("Match Check - Dashboard:", currentDoctorId, "Target:", targetDoctorId);

            toast(`New Request from ${data.patientName}!`, { icon: '🔔', id: "slot-req" });
            setActiveRequest(data);
            fetchAppointments();
        });

        socket.on("call-accepted", () => {
             console.log("--- PATIENT ACCEPTED CALL. INITIATING WEBRTC PEER ---");
             setCallAccepted(true);
             toast(`Patient has joined the room. Connecting video...`);
             
             // Use a stable ID and current stream for signaling
             const apptId = selectedAppt?._id;
             const activeStream = stream || myVideo.current?.srcObject;

             // Doctor is caller so initiate peer
             const peer = new Peer({
                 initiator: true,
                 trickle: false,
                 stream: activeStream,
                 config: {
                     iceServers: [
                         { urls: 'stun:stun.l.google.com:19302' },
                         { urls: 'stun:stun1.l.google.com:19302' },
                         { urls: 'stun:stun2.l.google.com:19302' },
                         { urls: 'stun:global.stun.twilio.com:3478' }
                     ]
                 }
             });
             
             peer.on("signal", (data) => {
                 console.log("--- DOCTOR GENERATED OFFER/SIGNAL ---");
                 socket.emit("webrtc-signal", {
                     appointmentId: apptId,
                     signal: data
                 });
             });
             
             peer.on("stream", (currentStream) => {
                 console.log("--- DOCTOR RECEIVED REMOTE STREAM ---");
                 if (userVideo.current) {
                     userVideo.current.srcObject = currentStream;
                 }
             });

             peer.on("error", (err) => {
                 console.error("--- DOCTOR PEER ERROR ---", err);
                 toast.error("Video connection failed.");
             });
             
             // Setup signal listener specifically for this peer session
             socket.off("webrtc-signal"); // Clear any previous ones
             socket.on("webrtc-signal", (signal) => {
                 console.log("--- DOCTOR RECEIVED SIGNAL ---", signal.type || "ice-candidate");
                 peer.signal(signal);
             });
             
             connectionRef.current = peer;
        });
        
        socket.on("call-rejected", () => {
             toast.error("Patient declined the call.", { icon: '❌' });
             leaveCall();
        });

        socket.on("call-ended", () => {
             toast("Call ended by patient.", { icon: 'ℹ️' });
             leaveCall();
        });

        return () => {
            socket.off("me");
            socket.off("incoming-slot-request");
            socket.off("call-accepted");
            socket.off("call-rejected");
            socket.off("webrtc-signal");
            socket.off("call-ended");
        };
    }, [selectedAppt?._id]); // Removed stream from dependencies to prevent listener reset mid-call


    // Explicitly join room when user ID is available
    useEffect(() => {
        const docId = user?._id || user?.id;
        if (docId) {
            socket.emit("join-room", `doctor_${docId}`);
            console.log(`Doctor ${docId} joining room: doctor_${docId}`);
        }

        const onConnect = () => {
            if (docId) {
                socket.emit("join-room", `doctor_${docId}`);
                console.log(`Doctor ${docId} re-joining room: doctor_${docId}`);
            }
        };
        socket.on("connect", onConnect);

        return () => {
            socket.off("connect", onConnect);
        };
    }, [user]);


    // Cleanup unused auto-call effect legacy code
    /* ---------------- WEBRTC ACTIONS ---------------- */
    const startCamera = async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: true,
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

    const startConsultation = async (appt) => {
        try {
            setSelectedAppt(appt);
            
            // 1. Join Appointment Room
            socket.emit("join-appointment-room", appt._id);
            
            // 2. Start Camera
            await startCamera();
            setIsVideoCallOpen(true);
            setCallEnded(false);
            setCallAccepted(false);

            // 3. Mark DB as Ringing
            await appointmentAPI.updateCallStatus(appt._id, 'ringing');
            
            // 4. Ping Patient
            const pId = appt.parent?._id || appt.parent;
            const patientIdStr = pId?.toString() || pId;
            console.log("[Video-Debug] Doctor Dashboard starting call for appt:", appt._id, "Target Patient:", patientIdStr);

            socket.emit("start-call", {
                appointmentId: appt._id.toString(),
                patientId: patientIdStr,
                doctorName: user?.name || "Doctor"
            });
            
            toast(`Ringing ${appt.patientName}...`, { icon: '📞' });
        } catch(e) {
            toast.error("Failed to start consultation.");
        }
    };

    const answerCall = async (id) => {
        setReceivingCall(false);
        setCallAccepted(true);
        setIsVideoCallOpen(true);
        
        const apptId = id || activeRequest?._id || selectedAppt?._id;
        if (!apptId) return;

        if (id) {
            // If we are answering a specific request, ensure it's selected
            const req = appointments.find(a => a._id === id) || activeRequest;
            if (req) setSelectedAppt(req);
        }

        socket.emit("join-appointment-room", apptId);
        await startCamera();

        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream || myVideo.current?.srcObject,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        socket.off("webrtc-signal");
        socket.on("webrtc-signal", (signal) => {
            peer.signal(signal);
        });

        peer.on("signal", (data) => {
            socket.emit("webrtc-signal", {
                appointmentId: apptId,
                signal: data
             });
        });

        peer.on("stream", (currentStream) => {
            if (userVideo.current) {
                 userVideo.current.srcObject = currentStream;
            }
        });

        connectionRef.current = peer;
        socket.emit("accept-call", { appointmentId: apptId });
    };

    const leaveCall = async () => {
        if (selectedAppt) {
             socket.emit("end-call", { appointmentId: selectedAppt._id });
             try {
                 await appointmentAPI.updateCallStatus(selectedAppt._id, 'ended');
             } catch(e) {}
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
        socket.off("webrtc-signal"); // Clear listener from peer setup
        fetchAppointments(); // Refresh to catch status change
    };

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



    /* ---------------- DB OPERATIONS ---------------- */
    const handleStatusUpdate = async (appt, newStatus) => {
        const id = appt?._id || appt;
        console.log("--- DASHBOARD DEBUG: handleStatusUpdate called ---", newStatus);

        if (!id) {
            toast.error("Error: Missing Appointment ID");
            return;
        }

        try {
            toast.loading(`Updating status to ${newStatus}...`, { id: "statusUpdate" });
            const res = await appointmentAPI.updateAppointmentStatus(id, { status: newStatus });

            if (res.success && newStatus === 'Confirmed') {
                // If confirmed from the list, also send socket response
                socket.emit("slot-response", {
                    parentSocketId: appt.parentSocketId,
                    status: 'accepted',
                    doctorName: user?.name || "Doctor",
                    slot: appt.timeSlot || appt.slot,
                    patientId: appt.parent?._id || appt.parent
                });
            }

            toast.success(`Appointment marked as ${newStatus}`, { id: "statusUpdate" });
            fetchAppointments();
        } catch (err) {
            console.error("--- DASHBOARD DEBUG: Status Update API Error ---", err);
            toast.error(`Update Failed: ${err.message || "Unknown error"}`, { id: "statusUpdate" });
        }
    };

    const handleDoctorResponse = (status, req = activeRequest) => {
        if (!req) return;

        if (status === 'Rescheduled') {
            setSelectedRequest(req);
            setRescheduleSlot(req.timeSlot);
            setRescheduleDate(req.date);
            setIsRescheduleModalOpen(true);
            setActiveRequest(null); // Clear the auto-popup
            return;
        }

        socket.emit("slot-response", {
            parentSocketId: req.parentSocketId,
            status: status, // 'accepted' or 'rejected'
            doctorName: user?.name || "Doctor",
            slot: req.slot || req.timeSlot,
            patientId: req.parent?._id || req.parent
        });

        if (status === 'accepted') {
            fetchAppointments(); // Refresh list to show new confirmed appt
        }

        setActiveRequest(null);
    };

    const handleConfirmReschedule = async () => {
        if (!selectedRequest || !rescheduleSlot || !rescheduleDate) {
            toast.error("Please select both date and time");
            return;
        }

        try {
            toast.loading("Rescheduling...", { id: "reschedule" });
            const res = await appointmentAPI.updateAppointmentStatus(selectedRequest._id, {
                status: 'Rescheduled',
                timeSlot: rescheduleSlot,
                date: rescheduleDate
            });

            if (res.success) {
                socket.emit("slot-response", {
                    parentSocketId: selectedRequest.parentSocketId,
                    status: 'Rescheduled',
                    doctorName: user?.name || "Doctor",
                    slot: rescheduleSlot,
                    date: rescheduleDate
                });

                toast.success("Appointment Rescheduled", { id: "reschedule" });
                setIsRescheduleModalOpen(false);
                fetchAppointments();
            }
        } catch (err) {
            toast.error("Failed to reschedule", { id: "reschedule" });
        }
    };

    // Old CallUser function removed. Using peer instantiation inside socket.on("call-accepted")  
    // and startLiveConsultation now.

    const handleCompleteConsultation = async () => {
        if (!selectedAppt) return;
        try {
            await appointmentAPI.completeConsultation(selectedAppt._id, consultNotes);
            toast.success("Consultation saved to records.");
            leaveCall();
            fetchAppointments();
            setActiveTab('history');
        } // eslint-disable-next-line no-unused-vars
        catch (err) {
            toast.error("Failed to save consultation details");
        }
    };


    /* ---------------- COMPUTED VARS ---------------- */
    const pendingRequests = appointments.filter(a => a.status === 'Pending');
    const upcomingAppointments = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Rescheduled');
    const completedAppointments = appointments.filter(a => a.status === 'Completed');

    const stats = [
        { label: "Today's Errands", value: upcomingAppointments.length, icon: <CalendarCheck className="w-8 h-8 text-purple-400" />, bg: "bg-purple-500/10 border-purple-500/30" },
        { label: "Pending Requests", value: pendingRequests.length, icon: <Clock className="w-8 h-8 text-amber-400" />, bg: "bg-amber-500/10 border-amber-500/30" },
        { label: "Completed Consults", value: completedAppointments.length, icon: <CheckCircle className="w-8 h-8 text-purple-400" />, bg: "bg-purple-500/10 border-purple-500/30" },
        { label: "Total Patients", value: new Set(appointments.map(a => a.patientName)).size, icon: <Users className="w-8 h-8 text-blue-400" />, bg: "bg-blue-500/10 border-blue-500/30" }
    ];


    /* ---------------- RENDER UI ---------------- */
    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white font-sans overflow-hidden">

            {/* SIDEBAR NAVIGATION */}
            <div className="w-64 bg-slate-900/40 backdrop-blur-md border-white/10 border-r border-white/10 flex flex-col shrink-0 z-10 transition-transform">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400">Dr. {user?.name || "Dashboard"}</h2>
                    <p className="text-sm text-slate-100 dark:text-slate-100 mt-1">Telemedicine Portal</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-slate-100 hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800 hover:text-slate-200'}`}>
                        <Users className="w-5 h-5" /> Overview
                    </button>

                    <button onClick={() => setActiveTab('pending')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'pending' ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-slate-100 hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800 hover:text-slate-200'}`}>
                        <div className="flex items-center gap-3"><Clock className="w-5 h-5" /> Pending </div>
                        {pendingRequests.length > 0 && <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md text-xs font-bold">{pendingRequests.length}</span>}
                    </button>

                    <button onClick={() => setActiveTab('upcoming')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'upcoming' ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-slate-100 hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800 hover:text-slate-200'}`}>
                        <CalendarCheck className="w-5 h-5" /> Upcoming
                    </button>

                    <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-slate-100 hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800 hover:text-slate-200'}`}>
                        <History className="w-5 h-5" /> History
                    </button>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto space-y-8">

                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h1 className="text-3xl font-bold text-white mb-8">Dashboard Overview</h1>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                        {stats.map((stat, i) => (
                                            <div key={i} className={`p-6 rounded-2xl border ${stat.bg} backdrop-blur-sm shadow-xl flex items-center gap-5 transition-transform hover:scale-105`}>
                                                <div className="p-3 bg-slate-900/40 backdrop-blur-md border-white/10 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                                    {stat.icon}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-sm font-medium">{stat.label}</p>
                                                    <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-slate-900/40 backdrop-blur-md border-white/10 border border-white/10 p-6 rounded-3xl shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                                <Clock className="text-amber-400" /> Recent Requests
                                            </h3>
                                            {pendingRequests.slice(0, 3).map(req => (
                                                <div key={req._id} className="p-4 bg-slate-900/40 backdrop-blur-xl border-white/10/80 dark:bg-slate-800/50 rounded-xl mb-3 border border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-white">{req.patientName}</p>
                                                        <p className="text-sm text-yellow-400 font-bold">{req.date} at {req.timeSlot}</p>
                                                    </div>
                                                    <button onClick={() => setActiveTab('pending')} className="text-xs bg-purple-600 px-3 py-1.5 rounded-lg text-white font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-500/20">View</button>
                                                </div>
                                            ))}
                                            {pendingRequests.length === 0 && <p className="text-white italic p-4 text-center">No pending requests</p>}
                                        </div>

                                        <div className="bg-slate-900/40 backdrop-blur-md border-white/10 border border-white/10 p-6 rounded-3xl shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                                <CalendarCheck className="text-purple-400" /> Up Next
                                            </h3>
                                            {upcomingAppointments.slice(0, 3).map(app => (
                                                <div key={app._id} className="p-4 bg-purple-500/5 rounded-xl mb-3 border border-purple-500/20 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-200">{app.patientName}</p>
                                                        <p className="text-sm text-purple-400 w-fit">{app.date} at {app.timeSlot}</p>
                                                    </div>
                                                    <button onClick={() => startConsultation(app)} className="text-xs bg-purple-600 px-3 py-1.5 rounded-lg font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-500/20 flex gap-1 items-center">
                                                        <Video className="w-3 h-3" /> Start
                                                    </button>
                                                </div>
                                            ))}
                                            {upcomingAppointments.length === 0 && <p className="text-white italic p-4 text-center">No upcoming appointments</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PENDING REQUESTS TAB */}
                            {activeTab === 'pending' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h1 className="text-3xl font-bold text-white mb-8">Pending Slot Requests</h1>
                                    <div className="space-y-4">
                                        {pendingRequests.length === 0 ? (
                                            <div className="p-12 border border-white/20 border-dashed rounded-3xl text-center bg-slate-900/40">
                                                <Clock className="w-12 h-12 text-white mx-auto mb-4" />
                                                <p className="text-white font-bold text-lg">Your queue is empty.</p>
                                            </div>
                                        ) : pendingRequests.map(req => (
                                            <div key={req._id} className="bg-slate-800/90 backdrop-blur-md border-white/20 border p-6 rounded-2xl flex items-center justify-between hover:border-purple-400 transition-colors shadow-2xl">
                                                <div className="flex-1">
                                                    <div className="flex gap-4 items-center">
                                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">{req.patientName}</h3>
                                                        <span className="bg-amber-500 text-black text-xs px-3 py-1 rounded-full font-black">PENDING</span>
                                                    </div>
                                                    <p className="text-white text-lg mt-2 mb-4">Reason: <span className="text-purple-100 font-medium italic">&quot;{req.reason}&quot;</span></p>
                                                    <div className="flex gap-4 text-sm font-bold">
                                                        <span className="flex items-center gap-2 text-white bg-purple-600/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-inner"><CalendarCheck className="w-5 h-5" /> {req.date}</span>
                                                        <span className="flex items-center gap-2 text-white bg-purple-600/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-inner"><Clock className="w-5 h-5" /> {req.timeSlot}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 min-w-[140px]">
                                                    <button onClick={() => handleStatusUpdate(req, 'Confirmed')} className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                        <CheckCircle className="w-4 h-4" /> Accept
                                                    </button>
                                                    <button onClick={() => handleDoctorResponse('Rescheduled', req)} className="py-2.5 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-500/50 hover:bg-red-500/10">
                                                        <XCircle className="w-4 h-4" /> Decline & Reschedule
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* UPCOMING APPOINTMENTS TAB */}
                            {activeTab === 'upcoming' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h1 className="text-3xl font-bold text-white mb-8">Upcoming Consultations</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {upcomingAppointments.length === 0 ? (
                                            <div className="col-span-full p-12 border border-white/10 border-dashed rounded-3xl text-center">
                                                <CalendarCheck className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                                <p className="text-white font-medium">No scheduled consultations ahead.</p>
                                            </div>
                                        ) : upcomingAppointments.map(app => (
                                            <div key={app._id} className="bg-slate-900/40 backdrop-blur-md border-white/10 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-purple-500/20 transition" />
                                                <h3 className="text-xl font-bold text-white mb-1">{app.patientName}</h3>
                                                <p className="text-purple-400 text-sm font-bold tracking-widest uppercase mb-4">{app.date} • {app.timeSlot}</p>

                                                <div className="bg-slate-900/40 backdrop-blur-xl border-white/10/80 dark:bg-slate-800/50 p-4 rounded-xl mb-6">
                                                    <p className="text-sm text-white font-medium line-clamp-2">Context: <span className="text-white">{app.reason}</span></p>
                                                </div>

                                                <button onClick={() => startConsultation(app)} className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 rounded-xl font-bold shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                                                    <Video className="w-5 h-5" /> {app.callStatus === 'ringing' || app.callStatus === 'ongoing' ? 'Reconnect Live Consultation' : 'Start Live Consultation'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* HISTORY TAB */}
                            {activeTab === 'history' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h1 className="text-3xl font-bold text-white mb-8">Consultation History</h1>
                                    <div className="bg-slate-900/40 backdrop-blur-md border-white/10 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800/40 backdrop-blur-md/80 text-white font-medium text-sm uppercase tracking-wider border-b border-white/10">
                                                    <th className="p-4 font-medium">Date</th>
                                                    <th className="p-4 font-medium">Patient</th>
                                                    <th className="p-4 font-medium">Diagnosis</th>
                                                    <th className="p-4 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                                                {completedAppointments.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-slate-100 dark:text-slate-100 italic">No past consultations found.</td>
                                                    </tr>
                                                ) : completedAppointments.map(app => (
                                                    <tr key={app._id} className="hover:bg-slate-900/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="p-4 text-slate-200 relative whitespace-nowrap">
                                                            {app.date}
                                                            <span className="block text-xs text-slate-100 dark:text-slate-100">{app.timeSlot}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-slate-200">{app.patientName}</p>
                                                        </td>
                                                        <td className="p-4 text-white font-medium max-w-xs truncate">
                                                            {app.diagnosis || "No diagnosis saved."}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => { setSelectedAppt(app); setShowDetailsModal(true); }} className="inline-flex items-center gap-1 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                                                                <FileText className="w-4 h-4" /> View Notes
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Incoming Slot Request Popup */}
            {activeRequest && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Clock className="w-8 h-8 text-purple-400 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">New Slot Request</h3>
                        <p className="text-gray-400 mb-6">
                            <span className="text-white font-medium">{activeRequest.patientName}</span> is requesting a consultation for:
                            <br />
                            <span className="text-purple-400 font-bold text-lg inline-block mt-2">
                                {activeRequest.timeSlot || activeRequest.slot} ({activeRequest.date || (activeRequest.day === 0 ? 'Today' : activeRequest.day === 1 ? 'Tomorrow' : 'Day After')})
                            </span>
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => handleDoctorResponse('Rescheduled')}
                                className="flex-1 py-3 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-700 text-gray-300 rounded-xl font-bold transition"
                            >
                                Decline & Reschedule
                            </button>
                            <button
                                onClick={() => handleDoctorResponse('accepted')}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESCHEDULE MODAL */}
            {isRescheduleModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Reschedule Appointment</h2>
                            <button onClick={() => setIsRescheduleModalOpen(false)} className="text-slate-400 hover:text-white transition"><X /></button>
                        </div>

                        <p className="text-slate-100 mb-6">Suggest a new time for <span className="text-purple-400 font-bold">{selectedRequest.patientName}</span>.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">New Date</label>
                                <select
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                >
                                    <option value="Today">Today</option>
                                    <option value="Tomorrow">Tomorrow</option>
                                    <option value="Day After">Day After</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">New Time Slot</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "04:45 PM", "06:00 PM"]
                                        .filter(slot => {
                                            if (rescheduleDate === 'Today' && selectedRequest?.timeSlot) {
                                                return timeToMinutes(slot) > timeToMinutes(selectedRequest.timeSlot);
                                            }
                                            return true;
                                        })
                                        .map(slot => (
                                            <button
                                                key={slot}
                                                onClick={() => setRescheduleSlot(slot)}
                                                className={`py-2 rounded-lg border text-sm font-bold transition ${rescheduleSlot === slot ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800/40 border-white/10 text-slate-400 hover:border-purple-500/50'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button onClick={() => setIsRescheduleModalOpen(false)} className="flex-1 py-3 bg-slate-800/40 text-slate-400 rounded-xl font-bold hover:bg-slate-700 transition">Cancel</button>
                            <button onClick={handleConfirmReschedule} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN VIDEO CONSULTATION SPLIT-MODAL */}
            {isVideoCallOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl border-white/10 z-[100] flex animate-in fade-in zoom-in-95 duration-300">
                    {/* LEFT SIDE: VIDEO ROOM */}
                    <div className={`${isNotesPanelOpen ? 'w-[70%]' : 'w-full'} h-full flex flex-col bg-slate-950 relative border-r border-white/10 transition-all duration-500 ease-in-out`}>
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl border-white/10/90 dark:bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white font-bold tracking-widest text-sm">LIVE</span>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
                            {callAccepted && !callEnded ? (
                                <div className="w-full h-full max-w-5xl max-h-[80%] border-2 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
                                    <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                                    <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                        <span className="text-[10px] text-white font-bold tracking-widest uppercase">Patient Feed</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-100 bg-slate-950">
                                    <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6" />
                                    <p className="font-bold text-lg text-white mb-2">Waiting for Patient...</p>
                                    <p className="text-white font-medium opacity-60">They will join your room shortly.</p>

                                    {receivingCall && !callAccepted && (
                                        <div className="mt-8 bg-slate-800/40 backdrop-blur-md/80 backdrop-blur border border-purple-500 p-6 rounded-3xl flex items-center gap-6 animate-bounce">
                                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                                <Phone className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">{selectedAppt?.patientName} is calling...</h3>
                                            </div>
                                            <button onClick={() => answerCall(activeRequest?._id)} className="px-6 py-2 bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600">Accept</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Floating File Toggle (When hidden) */}
                            {!isNotesPanelOpen && (
                                <button
                                    onClick={() => setIsNotesPanelOpen(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-l-2xl shadow-[-10px_0_30px_rgba(168,85,247,0.4)] z-50 transition-all hover:pr-6 group flex items-center gap-2 animate-in slide-in-from-right-10"
                                    title="Open Consultation File"
                                >
                                    <FileText className="w-6 h-6" />
                                    <span className="font-bold text-sm hidden group-hover:block">Open File</span>
                                </button>
                            )}

                            {/* DOCTOR PIP (Self View) */}
                            {stream && (
                                <div className="absolute bottom-10 right-10 w-56 aspect-[4/3] rounded-2xl border-2 border-purple-500/50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black z-[60] group/pip">
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600/80 backdrop-blur-md rounded-md text-[10px] font-black text-white z-10 border border-white/20">YOU</div>
                                    <video ref={myVideo} autoPlay playsInline muted className={`w-full h-full object-cover transition-transform duration-700 ${!isCameraOff ? "scale-x-[-1]" : ""}`} />
                                    {isCameraOff && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                            <VideoOff className="w-8 h-8 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* VIDEO CONTROLS */}
                        <div className="h-24 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-8 relative shrink-0">
                            {/* Toggle File Button */}
                            <button
                                onClick={() => setIsNotesPanelOpen(!isNotesPanelOpen)}
                                className={`absolute left-10 flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${isNotesPanelOpen ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'}`}
                                title={isNotesPanelOpen ? "Hide Consultation File" : "Show Consultation File"}
                            >
                                <FileText className="w-5 h-5" />
                                <span className="font-black text-xs uppercase tracking-widest">{isNotesPanelOpen ? "Hide File" : "Show File"}</span>
                            </button>

                            <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-red-500 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
                                {isMuted ? <MicOff /> : <Mic />}
                            </button>
                            <button onClick={leaveCall} className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:bg-red-500 transition-transform active:scale-90">
                                <Phone className="rotate-[135deg]" />
                            </button>
                            <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? "bg-red-500 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
                                {isCameraOff ? <VideoOff /> : <Camera />}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT SIDE: PATIENT CONTEXT & FORMS */}
                    {isNotesPanelOpen && (
                        <div className="w-[30%] h-full bg-slate-900/40 backdrop-blur-md border-white/10 overflow-y-auto purple-scrollbar flex flex-col p-6 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-right-full duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Consultation File</h2>
                                <button onClick={leaveCall} className="p-2 bg-slate-800/40 backdrop-blur-md text-white font-medium hover:text-white dark:hover:text-white rounded-full transition"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Patient Brief */}
                            <div className="bg-slate-900/40 backdrop-blur-xl border-white/10/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 mb-6">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20">
                                        <User className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{selectedAppt?.patientName}</h3>
                                    </div>
                                </div>

                                {/* Patient Details: Age, Gender, Weight (Fetched from populated parent profile) */}
                                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                    <div className="bg-slate-800/50 border border-white/5 p-2 rounded-xl">
                                        <p className="text-[10px] uppercase text-purple-300 font-bold mb-0.5">Age</p>
                                        <p className="text-white font-black">{calculateAge(selectedAppt?.parent?.dob)}</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-white/5 p-2 rounded-xl">
                                        <p className="text-[10px] uppercase text-purple-300 font-bold mb-0.5">Gender</p>
                                        <p className="text-white font-black">{selectedAppt?.parent?.gender || "N/A"}</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-white/5 p-2 rounded-xl">
                                        <p className="text-[10px] uppercase text-purple-300 font-bold mb-0.5">Weight</p>
                                        <p className="text-white font-black">{selectedAppt?.parent?.weight ? `${selectedAppt.parent.weight} kg` : "N/A"}</p>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-purple-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm">
                                    <span className="text-slate-100 dark:text-slate-100 block mb-1">Reason for visit:</span>
                                    <p className="text-slate-200">{selectedAppt?.reason}</p>
                                </div>
                            </div>

                            {/* DOCTOR NOTES FORM */}
                            <div className="flex-1 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-white font-medium mb-2 uppercase tracking-wide">Diagnosis</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Viral URI"
                                        value={consultNotes.diagnosis}
                                        onChange={(e) => setConsultNotes({ ...consultNotes, diagnosis: e.target.value })}
                                        className="w-full bg-purple-50/50 dark:bg-slate-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white font-medium mb-2 uppercase tracking-wide">Prescriptions</label>
                                    <textarea
                                        placeholder="Medications and dosages..."
                                        rows={4}
                                        value={consultNotes.prescriptions}
                                        onChange={(e) => setConsultNotes({ ...consultNotes, prescriptions: e.target.value })}
                                        className="w-full bg-purple-50/50 dark:bg-slate-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white font-medium mb-2 uppercase tracking-wide">Doctor Observations & Notes</label>
                                    <textarea
                                        placeholder="Private notes regarding the patient..."
                                        rows={4}
                                        value={consultNotes.notes}
                                        onChange={(e) => setConsultNotes({ ...consultNotes, notes: e.target.value })}
                                        className="w-full bg-purple-50/50 dark:bg-slate-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* SAVE ACTION */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <button onClick={handleCompleteConsultation} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 rounded-xl font-bold shadow-xl shadow-purple-500/20 active:scale-[0.98] transition flex justify-center items-center gap-2">
                                    <Save className="w-5 h-5" /> Save & End Consultation
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW DETAILS MODAL (HISTORY TAB) */}
            {showDetailsModal && selectedAppt && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900/40 backdrop-blur-md border-white/10 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Consultation File</h2>
                                <p className="text-purple-400 font-medium">Completed on {selectedAppt.date} at {selectedAppt.timeSlot}</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-2 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/40 backdrop-blur-xl border-white/10 dark:hover:bg-slate-700 text-white font-medium hover:text-white dark:hover:text-white rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8 bg-purple-50/50 dark:bg-slate-950 p-5 rounded-2xl border border-white/10">
                            <div className="col-span-2">
                                <p className="text-slate-100 dark:text-slate-100 uppercase tracking-wider mb-1">Patient Profile</p>
                                <p className="text-white font-bold text-lg">{selectedAppt.patientName}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-slate-100 dark:text-slate-100 uppercase tracking-wider mb-1">Initial Complaint / Reason</p>
                                <p className="text-slate-200">{selectedAppt.reason}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-white font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-3">Diagnosis</h4>
                                <p className="text-slate-200 bg-purple-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">{selectedAppt.diagnosis || "No specific diagnosis provided."}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-3">Prescriptions</h4>
                                <p className="text-slate-200 bg-purple-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 whitespace-pre-wrap">{selectedAppt.prescriptions || "No prescriptions attached."}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-3">Consultation Notes</h4>
                                <p className="text-slate-200 bg-purple-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 whitespace-pre-wrap">{selectedAppt.notes || "No additional notes."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DoctorDashboard;
