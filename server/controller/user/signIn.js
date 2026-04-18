import { asyncHandler } from "../../utils/asyncHandler.js";
import usermodel from "../../models/user/user.js";
import doctormodel from "../../models/user/doctorSchema.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const signin = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    // Check required fields
    if (!email || !password || !role) {
        return res.status(400).json({
            message: 'Missing required fields: email, password, and role are required'
        });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedRole = (role || '').toLowerCase();

    if (!process.env.JWT_SECRET) {
        console.error("TOKEN_SECRET_KEY is not configured in environment variables");
        return res.status(500).json({
            message: "Server configuration error: JWT secret key is missing",
            error: "Internal server configuration error"
        });
    }

    try {
        let userData;

        // use case-insensitive email lookup to be robust against casing differences
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const emailQuery = { email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } };

        if (normalizedRole === 'doctor') {
            userData = await doctormodel.findOne(emailQuery);
        } else if (normalizedRole === 'user' || normalizedRole === 'parents') {
            // Map PARENTS role to user model for database lookup
            userData = await usermodel.findOne(emailQuery);
        } else {
            return res.status(400).json({ message: "Invalid role provided. Please use 'PARENTS' or 'DOCTOR'" });
        }

        if (!userData) {
            console.log('No user found for', { normalizedEmail, normalizedRole });
            return res.status(400).json({ message: 'Incorrect email or password' });
        }

        console.log('Found user for login:', { id: userData._id.toString(), email: userData.email, role: normalizedRole });
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        console.log('bcrypt.compare result for', userData.email, isPasswordValid);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Incorrect email or password" });
        }

        const tokendata = {
            id: userData._id,
            email: userData.email,
            role: normalizedRole
        };

        const token = jwt.sign(tokendata, process.env.JWT_SECRET, { expiresIn: 60 * 60 * 8 });

        const tokenOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };

        // Construct response data with all profile fields
        const responseData = {
            id: userData._id,
            email: userData.email,
            role: normalizedRole,
        };

        if (normalizedRole === 'doctor') {
            responseData.firstName = userData.firstName;
            responseData.lastName = userData.lastName;
            responseData.experience = userData.experience;
            responseData.about = userData.about;
            responseData.rating = userData.rating;
        } else if (normalizedRole === 'user' || normalizedRole === 'parents') {
            responseData.kidName = userData.kidName;
            responseData.dob = userData.dob;
            responseData.fatherName = userData.fatherName;
            responseData.motherName = userData.motherName;
            responseData.contactNumber = userData.contactNumber;
            responseData.city = userData.city;
            responseData.state = userData.state;
            responseData.postalCode = userData.postalCode;
            // New fields
            responseData.weight = userData.weight;
            responseData.height = userData.height;
            responseData.gender = userData.gender;
            responseData.disease = userData.disease;
            responseData.bloodGroup = userData.bloodGroup;
        }

        return res
            .cookie("token", token, tokenOptions)
            .status(200)
            .json({
                message: "Login successful",
                data: responseData,
                token: token,
                success: true,
                error: false
            });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "An error occurred during sign-in",
            error: error.message
        });
    }
});

export default signin;