
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import dbConnect from './config/database/DBconnect.js';
import router from './routes/routes.js';
import githubWebhook from './routes/githubWebhook.js';

const PORT = process.env.PORT || 5000;
const app = express();


// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true, // Allow FRONTEND_URL environment variable or fallback to reflecting origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', router);



// Email Notification to Doctor
// app.post('/api/notify-doctor', async (req, res) => {
//   const { doctorId, channelName } = req.body;

//   if (!doctorId || !channelName) {
//     return res.status(400).json({ error: "Doctor ID and channel name are required." });
//   }

//   try {
//     const doctor = await doctormodel.findById(doctorId); // Assuming a Doctor model
//     const doctorEmail = doctor.email;

//     const transporter = nodemailer.createTransport({
//       service: 'Gmail',
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: doctorEmail,
//       subject: 'Video Call Invitation',
//       text: `You have an incoming video call. Please join using the following link: http://localhost:5173/video-call${channelName}`,
//     };
// console.log('doctor email',doctorEmail);

//     await transporter.sendMail(mailOptions);
//     res.json({ message: "Doctor notified successfully via email." });
//   } catch (error) {
//     console.error("Error notifying doctor:", error);
//     res.status(500).json({ error: "Failed to notify doctor.", details: error.message });
//   }
// });

app.use("/api/github", githubWebhook);
//error handling 
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route Not Found' });
});
//500 error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'internal server error' });
});
// Database connection and server start
import { createServer } from "http";
import { Server } from "socket.io";

// import { GoogleGenerativeAI } from "@google/generative-ai"; // Removed

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


io.on("connection", (socket) => {
  console.log("[Socket-Debug] User connected:", socket.id);
  
  // Debug: catch all events
  socket.onAny((event, ...args) => {
    console.log(`[Socket-Event-Debug] Event: ${event}, Args:`, JSON.stringify(args));
  });

  socket.emit("me", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });


  socket.on("join-appointment-room", (appointmentId) => {
    const roomId = `appointment_${appointmentId}`;
    socket.join(roomId);
    console.log(`[Video] User ${socket.id} joined ${roomId}`);
  });

  socket.on("start-call", (data) => {
    // data.appointmentId, data.patientId, data.doctorName
    const pId = data.patientId?.toString() || data.patientId;
    const genericPatientRoom = `patient_${pId}`;
    console.log(`[Video] Doctor starting call for appointment: ${data.appointmentId}. Pinging patient room: ${genericPatientRoom}`);
    
    io.to(genericPatientRoom).emit("incoming-call", {
      appointmentId: data.appointmentId,
      doctorName: data.doctorName,
      doctorSocketId: socket.id
    });
  });

  socket.on("accept-call", (data) => {
    // data.appointmentId
    const roomId = `appointment_${data.appointmentId}`;
    console.log(`[Video] Patient accepted call for ${roomId}. Notifying room.`);
    socket.to(roomId).emit("call-accepted");
  });

  socket.on("reject-call", (data) => {
    // data.appointmentId
    const roomId = `appointment_${data.appointmentId}`;
    console.log(`[Video] Patient rejected call for ${roomId}.`);
    socket.to(roomId).emit("call-rejected");
  });

  socket.on("webrtc-signal", (data) => {
    // data.appointmentId, data.signal
    const roomId = `appointment_${data.appointmentId}`;
    console.log(`[Video] Relaying WebRTC signal in ${roomId} from ${socket.id}`);
    socket.to(roomId).emit("webrtc-signal", data.signal);
  });

  socket.on("end-call", (data) => {
    // data.appointmentId
    const roomId = `appointment_${data.appointmentId}`;
    console.log(`[Video] Call ended for ${roomId}.`);
    socket.to(roomId).emit("call-ended");
  });

  // Slot Booking Events
  socket.on("request-slot", (data) => {
    const slotVal = data.timeSlot || data.slot;
    console.log("[Slot] Request from:", data.parentName, "for slot:", slotVal, "to doctor:", data.doctor);

    // Send to specific doctor's room (joined by doctor on dashboard load)
    const doctorId = data.doctor || data.doctorId;
    const targetRoom = `doctor_${doctorId}`;
    const roomClients = io.sockets.adapter.rooms.get(targetRoom);
    console.log(`[Slot] Emitting to room: ${targetRoom}. Active clients in room: ${roomClients ? roomClients.size : 0}`);

    io.to(targetRoom).emit("incoming-slot-request", {
      ...data,
      parentSocketId: socket.id
    });
  });

  socket.on("slot-response", (data) => {
    console.log("[Slot] Response handled. Decision:", data.status, "Target Parent:", data.patientId || data.parentSocketId);

    const responseData = {
      status: data.status, // 'accepted' or 'rejected'
      doctorName: data.doctorName,
      slot: data.slot
    };

    if (data.patientId) {
      // Send to persistent room
      const targetRoom = `patient_${data.patientId}`;
      io.to(targetRoom).emit("slot-confirmation", responseData);
      console.log(`[Slot] Emitted confirmation to persistent room: ${targetRoom}`);
    } else if (data.parentSocketId) {
      // Fallback to transient socket ID
      io.to(data.parentSocketId).emit("slot-confirmation", responseData);
      console.log(`[Slot] Emitted confirmation to transient ID: ${data.parentSocketId}`);
    }
  });
});

dbConnect().then(() => {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port: ${PORT} and accessible on all network interfaces`);
  });
}).catch(err => {
  console.error("Database connection failed:", err);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

