
import usermodel from "../../models/user/user.js";
import doctormodel from "../../models/user/doctorSchema.js";

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role.toLowerCase();
        const updateData = { ...req.body };

        // Prevent updating sensitive fields like email, password, role directly (unless specific logic added)
        delete updateData.password;
        delete updateData.role;
        delete updateData.email;

        let updatedUser;

        if (role === 'doctor') {
            updatedUser = await doctormodel.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
        } else {
            // Parent/User
            updatedUser = await usermodel.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
        }

        if (!updatedUser) {
            console.error(`Update failed: User with ID ${userId} and role ${role} not found.`);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const responseData = {
            ...updatedUser.toObject(), // Convert Mongoose document to plain object
            role: role // Ensure role is present (critical for ProtectedRoute)
        };

        // Standardize 'name' for Frontend Header (Header uses user.name)
        if (role === 'doctor') {
            responseData.name = `Dr. ${updatedUser.firstName} ${updatedUser.lastName}`;
        } else {
            // Check for kidName or Parent's name
            responseData.name = updatedUser.kidName || updatedUser.fatherName || "User";
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: responseData
        });

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
    }
};
