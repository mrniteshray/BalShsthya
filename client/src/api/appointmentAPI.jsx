import axios from 'axios';
import CONFIG from '../config.js';

const API_BASE_URL = `${CONFIG.BACKEND_URL}/api`;

const getAuthToken = () => {
    return localStorage.getItem('token');
};

const createAuthInstance = () => {
    const token = getAuthToken();
    return axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
};

export const appointmentAPI = {
    requestAppointment: async (appointmentData) => {
        try {
            const response = await createAuthInstance().post('/appointments', appointmentData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to request appointment' };
        }
    },

    getDoctorAppointments: async (doctor = null) => {
        try {
            const url = doctor ? `/appointments/doctor?doctor=${doctor}` : '/appointments/doctor';
            const response = await createAuthInstance().get(url);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch appointments' };
        }
    },

    getParentAppointments: async () => {
        try {
            const response = await createAuthInstance().get('/appointments/parent');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch parent appointments' };
        }
    },

    updateAppointmentStatus: async (id, statusData) => {
        try {
            const cleanId = String(id).trim();
            const response = await createAuthInstance().patch(`/appointments/${cleanId}/status`, statusData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update appointment status' };
        }
    },

    completeConsultation: async (id, consultationDetails) => {
        try {
            const response = await createAuthInstance().post(`/appointments/${id}/complete`, consultationDetails);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to save consultation details' };
        }
    },

    deleteAppointment: async (id) => {
        try {
            const response = await createAuthInstance().delete(`/appointments/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to cancel appointment' };
        }
    },

    updateCallStatus: async (id, callStatus) => {
        try {
            const cleanId = String(id).trim();
            const response = await createAuthInstance().patch(`/appointments/${cleanId}/call-status`, { callStatus });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update call status' };
        }
    },

    getDoctors: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/doctorinfo`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch doctors' };
        }
    }
};

export default appointmentAPI;
