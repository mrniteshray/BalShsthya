import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'doctorsData',
        required: true
    },
    parentName: {
        type: String,
        required: true
    },
    parentEmail: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        default: ""
    },
    doctorName: {
        type: String,
        required: true
    },
    date: {
        type: String, // e.g. "2026-02-25" or "Today" or index
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Rejected', 'Rescheduled'],
        default: 'Pending'
    },
    callStatus: {
        type: String,
        enum: ['idle', 'ringing', 'ongoing', 'ended'],
        default: 'idle'
    },
    reason: {
        type: String,
        default: "General Consultation"
    },
    diagnosis: {
        type: String,
        default: ""
    },
    prescriptions: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
