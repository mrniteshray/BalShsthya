import usermodel from '../../models/user/user.js';

export const getVaccinations = async (req, res) => {
    try {
        const user = await usermodel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            completedVaccinations: user.completedVaccinations || {},
            vaccineBirthDate: user.vaccineBirthDate
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateVaccinations = async (req, res) => {
    try {
        const { completedVaccinations, vaccineBirthDate } = req.body;
        const user = await usermodel.findByIdAndUpdate(
            req.user.id,
            { completedVaccinations, vaccineBirthDate },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'Vaccinations updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};