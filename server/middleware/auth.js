import jwt from 'jsonwebtoken';
import User from '../models/user/user.js';
import Doctor from '../models/user/doctorSchema.js'; // Import Doctor model

async function authtoken(req, res, next) {

    try {
        console.log("--- AUTH DEBUG: Request received ---");
        console.log("Path:", req.path);
        console.log("Method:", req.method);
        const authHeader = req.headers.authorization || req.headers.token || req.headers.authtoken; // Added authtoken support just in case
        console.log("Auth Header presence:", !!authHeader);

        if (!authHeader) {
            return res.status(401).json({
                message: 'Authorization token missing. Please login.'
            });
        }

        // Extract token from Bearer format or use directly
        let token;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        } else {
            token = authHeader;
        }

        // Validate token format before verification
        if (!token || token.split('.').length !== 3) {
            return res.status(401).json({
                message: 'Invalid token format. Please provide a valid JWT token.'
            });
        }

        // Use JWT_SECRET to match signIn.js
        const secretKey = process.env.JWT_SECRET || process.env.TOKEN_SECRET_KEY;

        jwt.verify(token, secretKey, async (err, decoded) => {
            if (err) {
                console.error("Token verification error:", err.name, err.message);

                let errorMessage = 'Invalid or expired token.';
                if (err.name === 'TokenExpiredError') {
                    errorMessage = 'Token has expired. Please login again.';
                } else if (err.name === 'JsonWebTokenError') {
                    errorMessage = 'Invalid token format. Please provide a valid token.';
                }

                return res.status(401).json({
                    message: errorMessage
                });
            }

            // Extract ID and Role from token
            const userId = decoded.id || decoded.tokendata?.id;
            const role = (decoded.role || decoded.tokendata?.role || '').toLowerCase();

            if (!userId) {
                return res.status(403).json({
                    message: 'Token is missing required user information.'
                });
            }

            // Fetch the user from database based on role
            console.log("--- AUTH DEBUG: Token decoded ---");
            console.log("User ID:", userId);
            console.log("Role:", role);
            let user = null;
            if (role === 'doctor') {
                user = await Doctor.findById(userId);
            } else {
                // Default to User model (Parents/User)
                user = await User.findById(userId);
            }

            if (!user) {
                console.error(`Auth failed: User not found for ID ${userId} and role ${role}`);
                return res.status(401).json({
                    message: 'User not found. Please login again.'
                });
            }

            // Normalize req.user to include id and role from token if needed, or just the db object
            req.user = user;
            // Ensure req.user has the ID and Role properties readily available if the DB object differs slightly
            if (!req.user.id) req.user.id = user._id;
            if (!req.user.role) req.user.role = role || 'user';

            console.log("--- AUTH DEBUG: Success, proceeding to next ---");
            next();
        });

    } catch (error) {
        console.error("--- AUTH DEBUG: Middleware error ---", error);
        res.status(500).json({
            message: 'Authentication error occurred.',
            error: true,
            success: false
        });
    }
}

export default authtoken;
