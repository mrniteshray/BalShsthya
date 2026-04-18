import express from "express";
const router = express.Router();

import signUp from '../controller/user/signUp.js';
import signIn from '../controller/user/signIn.js';
import authtoken from "../middleware/auth.js";
import consultation from '../controller/services/consultation.js';
import doctorinfo from "../controller/user/doctorInfo.js";
import logout from '../controller/user/logOut.js';
import roomIdNotification from '../controller/notification/mail_roomId.js';
import sendContactUsEmail from "../controller/notification/mail_contactUs.js";
import listContactMessages from '../controller/notification/list_contact_messages.js';
import subscribeController from '../controller/notification/newsletter.js';
import upload from '../middleware/multer.js';
import { reviewDoctor } from '../controller/user/adminDashboard.js';
import isAdmin from '../middleware/isAdmin.js';
import { create } from "domain";

router.post('/signup', upload.single('document'), signUp);

import {
  createFeedLog,
  getFeedLogs,
  updateFeedLog,
  deleteFeedLog,
  createSleepLog,
  getSleepLogs,
  updateSleepLog,
  deleteSleepLog,
} from '../controller/feedLog.js';

import { chat, voice, resetVoice } from "../controller/careCoPilotController.js";
import githubCallback from "../controller/user/githubCallback.js";
import githubLoginRedirect from "../controller/user/githubLoginRedirect.js";

import {
  createGrowthLog,
  getGrowthLogs,
  getGrowthLogById,
  updateGrowthLog,
  deleteGrowthLog,
  updateReminderSettings,
  getGrowthStats,
  resetGrowthLogs
} from '../controller/growthTracker.js';

// Auth routes
router.post('/signin', signIn);
// signup route with multer middleware is declared above to handle file upload
router.post('/logout', logout);

import { updateProfile } from '../controller/user/updateProfile.js';
router.put('/update-profile', authtoken, updateProfile);

// Doctor and consultation
router.post('/consultation', authtoken, consultation);
router.get('/doctorinfo', doctorinfo);

// Notifications
router.post('/notify-doctor', roomIdNotification);
router.post("/contact-us", sendContactUsEmail);
router.post('/subscribe', subscribeController);
router.patch('/admin/review/:doctor', reviewDoctor);

// Dev/Admin route to view saved contact messages
router.get('/admin/contact-messages', listContactMessages);

// Appointment routes
import {
  updateAppointmentStatus,
  completeConsultation,
  updateCallStatus,
  deleteAppointment
} from '../controller/appointmentController.js';

router.post('/appointments', authtoken, requestAppointment);
router.get('/appointments/doctor', authtoken, getDoctorAppointments);
router.get('/appointments/parent', authtoken, getParentAppointments);
router.patch('/appointments/:id/status', authtoken, updateAppointmentStatus);
router.patch('/appointments/:id/call-status', authtoken, updateCallStatus);
router.post('/appointments/:id/complete', authtoken, completeConsultation);
router.delete('/appointments/:id', authtoken, deleteAppointment);


// FeedLog routes
router.post('/feedlogs', authtoken, createFeedLog);
router.get('/feedlogs', authtoken, getFeedLogs);
router.put('/feedlogs/:id', authtoken, updateFeedLog);
router.delete('/feedlogs/:id', authtoken, deleteFeedLog);

// SleepLog routes
router.post('/sleeplogs', authtoken, createSleepLog);
router.get('/sleeplogs', authtoken, getSleepLogs);
router.put('/sleeplogs/:id', authtoken, updateSleepLog);
router.delete('/sleeplogs/:id', authtoken, deleteSleepLog);

// Care Co-Pilot AI Medicine Finder routes
router.post('/carecopilot/chat', chat);
router.post('/carecopilot/voice', voice);
router.post('/carecopilot/voice/reset', resetVoice);

// Growth Tracker routes
router.post('/growth-logs', authtoken, createGrowthLog);
router.get('/growth-logs', authtoken, getGrowthLogs);
router.get('/growth-logs/:id', authtoken, getGrowthLogById);
router.put('/growth-logs/:id', authtoken, updateGrowthLog);
router.delete('/growth-logs/reset/:childId', authtoken, resetGrowthLogs);
router.delete('/growth-logs/:id', authtoken, deleteGrowthLog);
router.patch('/growth-logs/reminder-settings', authtoken, updateReminderSettings);
router.get('/growth-logs/stats', authtoken, getGrowthStats);

//Github oauth routes
router.get('/auth/github/callback', githubCallback)
router.get('/auth/github', githubLoginRedirect)

import { getVaccinations, updateVaccinations } from '../controller/user/vaccinations.js';

// Protected routes
router.get('/vaccinations', authtoken, getVaccinations);
router.put('/vaccinations', authtoken, updateVaccinations);

// News Route
import { getNews } from '../controllers/newsController.js';
router.get('/news', getNews);
// Blogs Route
import { getBlogs } from '../controllers/blogController.js';
router.get('/blogs', getBlogs);

// 404 handler for API
router.use((req, res) => {
  console.log(`[404 ERROR] Unhandled API request: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

export default router;

