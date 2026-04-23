import mongoose from 'mongoose';

const vaccinationRecordSchema = new mongoose.Schema({
    child_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    vaccine_name: {
        type: String,
        required: true,
        trim: true
    },
    vaccine_code: {
        type: String,
        required: true,
        trim: true
    },
    recommended_age_weeks: {
        type: Number,
        required: true,
        min: 0
    },
    recommended_age_display: {
        type: String,
        required: true
    },
    due_date: {
        type: Date,
        required: true
    },
    completed_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'due_today', 'completed', 'overdue', 'upcoming'],
        default: 'pending'
    },
    dose_number: {
        type: Number,
        default: 1
    },
    disease_prevented: {
        type: String,
        trim: true
    },
    side_effects: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    administered_by: {
        type: String,
        trim: true
    },
    batch_number: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
vaccinationRecordSchema.index({ child_id: 1, due_date: 1 });
vaccinationRecordSchema.index({ child_id: 1, status: 1 });

const VaccinationRecord = mongoose.model('VaccinationRecord', vaccinationRecordSchema);

export default VaccinationRecord;