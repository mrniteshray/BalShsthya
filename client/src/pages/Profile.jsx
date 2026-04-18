
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import CONFIG from "../config.js";
import { setUser } from "../store/slices/userSlice.jsx";
import { User, Mail, Phone, MapPin, Calendar, Activity, FileText, Briefcase, Award, Users } from "lucide-react";

// Helper to format date for input (YYYY-MM-DD)
const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
};

const Profile = () => {
    const { user } = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        if (user) {
            setFormData({ ...user, dob: formatDate(user.dob) });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(
                `${CONFIG.BACKEND_URL}/api/update-profile`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        // authtoken: token // keeping for backward compatibility if needed, but Authorization is primary
                    },
                }
            );

            if (response.data.success) {
                const updatedUser = response.data.data;
                dispatch(setUser(updatedUser)); // Update Redux state
                localStorage.setItem("userData", JSON.stringify(updatedUser)); // Update Local Storage
                setFormData({ ...updatedUser, dob: formatDate(updatedUser.dob) });
                setMessage({ type: "success", text: "Profile updated successfully!" });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Update failed", error);
            setMessage({ type: "error", text: error.response?.data?.message || "Failed to update profile." });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="pt-24 text-center">Loading profile...</div>;

    const isDoctor = user.role === "doctor";

    return (
        <div className="pt-24 pb-12 min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold backdrop-blur-sm">
                            {user.firstName ? user.firstName[0] : user.kidName ? user.kidName[0] : "U"}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {isDoctor ? `Dr. ${user.firstName} ${user.lastName}` : user.kidName}
                            </h1>
                            <p className="opacity-90">{user.email}</p>
                            <p className="text-sm bg-white/20 inline-block px-2 py-0.5 rounded-full mt-1 capitalize">
                                {user.role}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isEditing) setFormData({ ...user, dob: formatDate(user.dob) }); // Reset on cancel
                            setIsEditing(!isEditing);
                            setMessage({ type: "", text: "" });
                        }}
                        className={`px-6 py-2 rounded-full font-medium transition-colors ${isEditing
                            ? "bg-white/20 hover:bg-white/30 text-white"
                            : "bg-white text-purple-600 hover:bg-gray-100"
                            }`}
                    >
                        {isEditing ? "Cancel" : "Edit Profile"}
                    </button>
                </div>

                {/* Message Display */}
                {message.text && (
                    <div className={`p-4 text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* --- DOCTOR FIELDS --- */}
                    {isDoctor && (
                        <>
                            <div className="md:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2">Professional Info</h3>
                            </div>
                            <InputField
                                label="First Name" name="firstName" icon={<User />}
                                value={formData.firstName} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Last Name" name="lastName" icon={<User />}
                                value={formData.lastName} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Years of Experience" name="experience" type="number" icon={<Briefcase />}
                                value={formData.experience} onChange={handleChange} disabled={!isEditing}
                            />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">About</label>
                                <textarea
                                    name="about"
                                    value={formData.about || ""}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    rows="4"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition disabled:opacity-60"
                                />
                            </div>
                        </>
                    )}

                    {/* --- PARENT FIELDS --- */}
                    {!isDoctor && (
                        <>
                            {/* Child Info */}
                            <div className="md:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                                    <User className="w-5 h-5" /> Child Information
                                </h3>
                            </div>
                            <InputField
                                label="Child Name" name="kidName" value={formData.kidName} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Date of Birth" name="dob" type="date" icon={<Calendar />}
                                value={formData.dob} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Gender" name="gender" placeholder="Male/Female"
                                value={formData.gender} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Blood Group" name="bloodGroup" icon={<Activity />}
                                value={formData.bloodGroup} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Weight (kg)" name="weight" type="number" step="0.1" icon={<Activity />}
                                value={formData.weight} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Height (cm)" name="height" type="number" step="0.1" icon={<Activity />}
                                value={formData.height} onChange={handleChange} disabled={!isEditing}
                            />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Medical History / Diseases
                                </label>
                                <textarea
                                    name="disease"
                                    placeholder="Any known diseases or disabilities..."
                                    value={formData.disease || ""}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    rows="3"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition disabled:opacity-60"
                                />
                            </div>

                            {/* Parent Info */}
                            <div className="md:col-span-2 mt-4">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2 flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Parent Information
                                </h3>
                            </div>
                            <InputField
                                label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Contact Number" name="contactNumber" type="tel" icon={<Phone />}
                                value={formData.contactNumber} onChange={handleChange} disabled={!isEditing}
                            />
                            <InputField
                                label="Email" name="email" type="email" icon={<Mail />}
                                value={formData.email} onChange={handleChange} disabled={true} // Email usually not editable directly
                            />

                            <div className="md:col-span-2 mt-2">
                                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Address</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField
                                        label="City" name="city" icon={<MapPin />}
                                        value={formData.city} onChange={handleChange} disabled={!isEditing}
                                    />
                                    <InputField
                                        label="State" name="state"
                                        value={formData.state} onChange={handleChange} disabled={!isEditing}
                                    />
                                    <InputField
                                        label="Postal Code" name="postalCode"
                                        value={formData.postalCode} onChange={handleChange} disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Save Button */}
                    {isEditing && (
                        <div className="md:col-span-2 pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-70 disabled:scale-100"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// Reusable Input Component
const InputField = ({ label, name, type = "text", value, onChange, disabled, icon, placeholder, step }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {React.cloneElement(icon, { size: 18 })}
                </div>
            )}
            <input
                type={type}
                name={name}
                value={value || ""}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                step={step}
                className={`w-full ${icon ? "pl-10" : "px-4"} py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed`}
            />
        </div>
    </div>
);

export default Profile;
