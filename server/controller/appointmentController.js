import Appointment from '../models/Appointment.js';
import doctormondel from '../models/user/doctorSchema.js';
import mongoose from 'mongoose';

// 1. Parent requests an appointment slot
export const requestAppointment = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: requestAppointment called ---");
    try {
        const { doctor, doctorId: legacyDoctorId, doctorName, date, timeSlot, parentName, parentEmail, patientName, reason } = req.body;
        const doctorIdToSave = doctor || legacyDoctorId;
        const parentId = req.user.id; // from auth middleware

        // Fallback: Populate missing parent info from user profile
        let finalParentName = parentName;
        let finalParentEmail = parentEmail;
        let finalPatientName = patientName;

        if (!finalParentName || !finalParentEmail || !finalPatientName) {
            const parentProfile = await mongoose.model('user').findById(parentId);
            if (!finalParentName) finalParentName = parentProfile?.name || "Parent User";
            if (!finalParentEmail) finalParentEmail = parentProfile?.email || "parent@example.com";
            if (!finalPatientName) finalPatientName = parentProfile?.kidName || "Patient Profile";
        }

        const newAppointment = new Appointment({
            parent: parentId,
            doctor: doctorIdToSave,
            parentName: finalParentName,
            parentEmail: finalParentEmail,
            patientName: finalPatientName,
            doctorName,
            date,
            timeSlot,
            reason
        });

        console.log("--- CREATE APPOINTMENT DEBUG ---");
        console.log("Input Doctor:", doctorIdToSave);
        console.log("New Appointment Doc (Mongoose):", JSON.stringify(newAppointment.toObject(), null, 2));

        await newAppointment.save();
        return res.status(201).json({ success: true, message: "Appointment requested successfully", data: newAppointment });
    } catch (error) {
        console.error("Error creating appointment:", error);
        return res.status(500).json({ success: false, message: "Server error creating appointment" });
    }
};

// 2. Get appointments for a specific doctor
export const getDoctorAppointments = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: getDoctorAppointments called ---");
    try {
        const doctorIdFromUser = req.user.id; // from auth middleware
        // Wait, doctors login separately or use the same token? Let's query by doctorId passed in if needed, or from req.user
        // If auth assigns doctor ID to req.user.id, we use that. 
        // Alternatively, if the doctor dashboard uses a generic auth token and passes doctor ID:
        const idToSearch = req.query.doctor || req.query.doctorId || doctorIdFromUser;

        const appointments = await Appointment.find({
            $or: [
                { doctor: idToSearch },
                { doctorId: idToSearch }
            ]
        })
            .populate('parent')
            .sort({ createdAt: -1 });

        // Dynamic Fallback: Ensure patientName is never "Baby" or empty in the response
        const sanitizedAppointments = appointments.map(app => {
            const doc = app.toObject();
            if (!doc.patientName || doc.patientName === "Baby") {
                doc.patientName = doc.parent?.kidName || "Patient Profile";
            }
            return doc;
        });

        return res.status(200).json({ success: true, data: sanitizedAppointments });
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return res.status(500).json({ success: false, message: "Server error fetching appointments" });
    }
};

// 3. Get appointments for a parent
export const getParentAppointments = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: getParentAppointments called ---");
    try {
        const parentId = req.user.id;
        const appointments = await Appointment.find({ parent: parentId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        console.error("Error fetching parent appointments:", error);
        return res.status(500).json({ success: false, message: "Server error fetching appointments" });
    }
};

// 4. Update appointment status (Accept, Reject, Reschedule)
export const updateAppointmentStatus = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: updateAppointmentStatus called ---");
    try {
        const { id } = req.params;
        const { status, timeSlot, date } = req.body;

        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const appointment = isObjectId
            ? await Appointment.findById(id)
            : await Appointment.findOne({ _id: id });

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        appointment.status = status;
        if (timeSlot) appointment.timeSlot = timeSlot;
        if (date) appointment.date = date;

        // Validation Fix: If this is a legacy record missing 'doctor' field, populate it.
        // We use the ID of the doctor currently making the request (req.user.id).
        if (!appointment.doctor) {
            console.log("Fixing missing doctor field for appointment:", appointment._id);
            appointment.doctor = req.user.id;
        }

        await appointment.save();
        return res.status(200).json({ success: true, message: `Appointment ${status}`, data: appointment });
    } catch (error) {
        console.error("--- DEBUG START: Error updating appointment status ---");
        console.error("Error message:", error.message);
        console.error("Full error object:", error);
        console.error("--- DEBUG END ---");
        return res.status(500).json({ success: false, message: "Server error updating status", detail: error.message });
    }
};

export const updateCallStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { callStatus } = req.body;
        
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const appointment = isObjectId
            ? await Appointment.findById(id)
            : await Appointment.findOne({ _id: id });

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

        appointment.callStatus = callStatus;
        await appointment.save();

        return res.status(200).json({ success: true, message: "Call status updated", data: appointment });
    } catch (error) {
        console.error("Error updating call status:", error);
        return res.status(500).json({ success: false, message: "Server error updating call status" });
    }
};

// 5. Complete Consultation & Add Notes
export const completeConsultation = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: completeConsultation called ---");
    try {
        const { id } = req.params;
        const { diagnosis, prescriptions, notes } = req.body;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        appointment.status = 'Completed';
        if (diagnosis) appointment.diagnosis = diagnosis;
        if (prescriptions) appointment.prescriptions = prescriptions;
        if (notes) appointment.notes = notes;

        // Validation Fix: Ensure doctor field is present before saving legacy records
        if (!appointment.doctor) {
            appointment.doctor = req.user.id;
        }

        await appointment.save();
        return res.status(200).json({ success: true, message: "Consultation completed", data: appointment });
    } catch (error) {
        console.error("Error completing consultation:", error);
        return res.status(500).json({ success: false, message: "Server error completing consultation" });
    }
};

// 6. Delete/Cancel Appointment
export const deleteAppointment = async (req, res) => {
    console.log("--- CONTROLLER DEBUG: deleteAppointment called ---");
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        // Only allow parent or doctor associated to delete
        // In this app, we'll allow anyone with valid token for now or check ownership
        await Appointment.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Appointment cancelled successfully" });
    } catch (error) {
        console.error("Error deleting appointment:", error);
        return res.status(500).json({ success: false, message: "Server error deleting appointment" });
    }
};
