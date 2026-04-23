import Child from '../../models/Child.js';
import VaccinationRecord from '../../models/VaccinationRecord.js';
import {
    INDIAN_VACCINATION_SCHEDULE,
    calculateDueDate,
    getVaccineStatus
} from '../../utils/vaccinationSchedule.js';

// Create a new child
export const createChild = async (req, res) => {
    try {
        const { child_name, dob, gender, weight, height, blood_group, medical_conditions } = req.body;

        const child = new Child({
            parent_id: req.user.id,
            child_name,
            dob: new Date(dob),
            gender,
            weight,
            height,
            blood_group,
            medical_conditions
        });

        await child.save();

        // Generate vaccination schedule for the child
        await generateVaccinationSchedule(child._id, child.dob);

        res.status(201).json({
            message: 'Child registered successfully',
            child: {
                id: child._id,
                child_name: child.child_name,
                dob: child.dob,
                gender: child.gender
            }
        });
    } catch (error) {
        console.error('Error creating child:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all children for a parent
export const getChildren = async (req, res) => {
    try {
        const children = await Child.find({ parent_id: req.user.id })
            .select('child_name dob gender weight height blood_group medical_conditions createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({ children });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get vaccination schedule for a child
export const getChildVaccinations = async (req, res) => {
    try {
        const { childId } = req.params;

        // Verify child belongs to user
        const child = await Child.findOne({ _id: childId, parent_id: req.user.id });
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        const vaccinations = await VaccinationRecord.find({ child_id: childId })
            .sort({ due_date: 1 });

        // Calculate current status for each vaccination
        const vaccinationsWithStatus = vaccinations.map(vaccine => ({
            ...vaccine.toObject(),
            status: getVaccineStatus(vaccine.due_date, vaccine.completed_date)
        }));

        // Separate by status
        const pending = vaccinationsWithStatus.filter(v => v.status === 'pending');
        const dueToday = vaccinationsWithStatus.filter(v => v.status === 'due_today');
        const upcoming = vaccinationsWithStatus.filter(v => v.status === 'upcoming');
        const overdue = vaccinationsWithStatus.filter(v => v.status === 'overdue');
        const completed = vaccinationsWithStatus.filter(v => v.status === 'completed');

        res.status(200).json({
            child: {
                id: child._id,
                child_name: child.child_name,
                dob: child.dob,
                age_weeks: Math.floor((new Date() - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 7))
            },
            vaccinations: {
                pending,
                upcoming: [...dueToday, ...upcoming],
                overdue,
                completed
            },
            summary: {
                total: vaccinations.length,
                completed: completed.length,
                pending: pending.length,
                overdue: overdue.length,
                upcoming: dueToday.length + upcoming.length
            }
        });
    } catch (error) {
        console.error('Error fetching vaccinations:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark vaccination as completed
export const completeVaccination = async (req, res) => {
    try {
        const { vaccinationId } = req.params;
        const { administered_by, batch_number, notes } = req.body;

        const vaccination = await VaccinationRecord.findById(vaccinationId);

        if (!vaccination) {
            return res.status(404).json({ message: 'Vaccination not found' });
        }

        // Verify child belongs to user
        const child = await Child.findOne({ _id: vaccination.child_id, parent_id: req.user.id });
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        vaccination.completed_date = new Date();
        vaccination.status = 'completed';
        vaccination.administered_by = administered_by;
        vaccination.batch_number = batch_number;
        vaccination.notes = notes;

        await vaccination.save();

        res.status(200).json({
            message: 'Vaccination marked as completed',
            vaccination: vaccination
        });
    } catch (error) {
        console.error('Error completing vaccination:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get vaccination reminders for dashboard
export const getVaccinationReminders = async (req, res) => {
    try {
        // Get all children for the user
        const children = await Child.find({ parent_id: req.user.id });

        if (children.length === 0) {
            return res.status(200).json({
                reminders: [],
                message: 'No children registered yet'
            });
        }

        const reminders = [];

        for (const child of children) {
            const vaccinations = await VaccinationRecord.find({
                child_id: child._id,
                completed_date: null // Only pending vaccinations
            });

            const today = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(today.getDate() + 7);

            // Due today
            const dueToday = vaccinations.filter(v => {
                const dueDate = new Date(v.due_date);
                return dueDate.toDateString() === today.toDateString();
            });

            // Due in next 7 days
            const dueSoon = vaccinations.filter(v => {
                const dueDate = new Date(v.due_date);
                return dueDate > today && dueDate <= sevenDaysFromNow;
            });

            // Overdue
            const overdue = vaccinations.filter(v => {
                const dueDate = new Date(v.due_date);
                return dueDate < today;
            });

            if (dueToday.length > 0 || dueSoon.length > 0 || overdue.length > 0) {
                reminders.push({
                    child: {
                        id: child._id,
                        name: child.child_name,
                        age_weeks: Math.floor((today - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 7))
                    },
                    due_today: dueToday.length,
                    due_soon: dueSoon.length,
                    overdue: overdue.length,
                    urgent_vaccines: [
                        ...dueToday.map(v => ({ name: v.vaccine_name, due_date: v.due_date, status: 'due_today' })),
                        ...overdue.slice(0, 3).map(v => ({ name: v.vaccine_name, due_date: v.due_date, status: 'overdue' }))
                    ]
                });
            }
        }

        res.status(200).json({ reminders });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate vaccination schedule for a child
const generateVaccinationSchedule = async (childId, dob) => {
    try {
        const vaccinationRecords = INDIAN_VACCINATION_SCHEDULE.map(vaccine => ({
            child_id: childId,
            vaccine_name: vaccine.name,
            vaccine_code: vaccine.code,
            recommended_age_weeks: vaccine.weeks,
            recommended_age_display: vaccine.display,
            due_date: calculateDueDate(dob, vaccine.weeks),
            disease_prevented: vaccine.disease,
            side_effects: vaccine.sideEffects,
            notes: vaccine.notes,
            dose_number: 1
        }));

        await VaccinationRecord.insertMany(vaccinationRecords);
        console.log(`Generated ${vaccinationRecords.length} vaccination records for child ${childId}`);
    } catch (error) {
        console.error('Error generating vaccination schedule:', error);
        throw error;
    }
};