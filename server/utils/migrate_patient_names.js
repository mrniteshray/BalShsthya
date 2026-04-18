
import mongoose from 'mongoose';
import 'dotenv/config';
import '../models/user/user.js'; // Ensure model is registered
import Appointment from '../models/Appointment.js';

const migrate = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI not found in environment.");
        }
        
        console.log("Connecting to:", uri.split('@')[1] || "the database..."); // Log partial URI for safety
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully.");

        const appointments = await Appointment.find({ 
            $or: [
                { patientName: "Baby" }, 
                { patientName: "" }, 
                { patientName: { $exists: false } },
                { childName: "Baby" }
            ] 
        }).populate('parent');

        console.log(`Found ${appointments.length} appointments to update.`);

        let updatedCount = 0;
        for (const app of appointments) {
            const parentProfile = app.parent;
            const correctName = parentProfile?.kidName || "Patient Profile";
            
            if (correctName === "Baby" && parentProfile?.kidName === undefined) {
                 // skip if we can't find a better name
                 continue;
            }

            console.log(`Updating Appointment ${app._id}: ${app.patientName || app.childName || "Legacy"} -> ${correctName}`);
            
            app.patientName = correctName;
            // Remove the legacy field if it exists
            app.set('childName', undefined);
            
            await app.save();
            updatedCount++;
        }

        console.log(`Migration completed. ${updatedCount} records updated.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrate();
