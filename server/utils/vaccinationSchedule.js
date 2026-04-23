// Comprehensive Indian Child Vaccination Schedule
export const INDIAN_VACCINATION_SCHEDULE = [
    // At Birth
    {
        name: "BCG (Bacillus Calmette-Guérin)",
        code: "BCG",
        weeks: 0,
        display: "At Birth",
        disease: "Tuberculosis (TB)",
        sideEffects: "Small scar at injection site, mild fever",
        notes: "Given in left upper arm"
    },
    {
        name: "OPV-0 (Oral Polio Vaccine)",
        code: "OPV_0",
        weeks: 0,
        display: "At Birth",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "First dose of polio vaccine"
    },
    {
        name: "Hepatitis B-1",
        code: "HEP_B_1",
        weeks: 0,
        display: "At Birth",
        disease: "Hepatitis B",
        sideEffects: "Mild fever, soreness at injection site",
        notes: "First dose in hepatitis B series"
    },

    // 6 Weeks
    {
        name: "Pentavalent-1 (DTP + Hib + Hep B)",
        code: "PENTA_1",
        weeks: 6,
        display: "6 Weeks",
        disease: "Diphtheria, Tetanus, Pertussis, Hib, Hepatitis B",
        sideEffects: "Fever, pain at injection site, irritability",
        notes: "Combination vaccine for multiple diseases"
    },
    {
        name: "OPV-1",
        code: "OPV_1",
        weeks: 6,
        display: "6 Weeks",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "Second dose of polio vaccine"
    },
    {
        name: "IPV-1 (Inactivated Polio Vaccine)",
        code: "IPV_1",
        weeks: 6,
        display: "6 Weeks",
        disease: "Polio",
        sideEffects: "Mild fever, soreness",
        notes: "Injectable polio vaccine"
    },
    {
        name: "Rotavirus-1",
        code: "ROTA_1",
        weeks: 6,
        display: "6 Weeks",
        disease: "Rotavirus diarrhea",
        sideEffects: "Mild diarrhea, irritability",
        notes: "Oral vaccine for severe diarrhea"
    },

    // 10 Weeks
    {
        name: "Pentavalent-2",
        code: "PENTA_2",
        weeks: 10,
        display: "10 Weeks",
        disease: "Diphtheria, Tetanus, Pertussis, Hib, Hepatitis B",
        sideEffects: "Fever, pain at injection site, irritability",
        notes: "Second dose in pentavalent series"
    },
    {
        name: "OPV-2",
        code: "OPV_2",
        weeks: 10,
        display: "10 Weeks",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "Third dose of polio vaccine"
    },
    {
        name: "IPV-2",
        code: "IPV_2",
        weeks: 10,
        display: "10 Weeks",
        disease: "Polio",
        sideEffects: "Mild fever, soreness",
        notes: "Second dose of injectable polio vaccine"
    },
    {
        name: "Rotavirus-2",
        code: "ROTA_2",
        weeks: 10,
        display: "10 Weeks",
        disease: "Rotavirus diarrhea",
        sideEffects: "Mild diarrhea, irritability",
        notes: "Second dose of rotavirus vaccine"
    },

    // 14 Weeks
    {
        name: "Pentavalent-3",
        code: "PENTA_3",
        weeks: 14,
        display: "14 Weeks",
        disease: "Diphtheria, Tetanus, Pertussis, Hib, Hepatitis B",
        sideEffects: "Fever, pain at injection site, irritability",
        notes: "Third and final dose in pentavalent series"
    },
    {
        name: "OPV-3",
        code: "OPV_3",
        weeks: 14,
        display: "14 Weeks",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "Fourth dose of polio vaccine"
    },
    {
        name: "IPV-3",
        code: "IPV_3",
        weeks: 14,
        display: "14 Weeks",
        disease: "Polio",
        sideEffects: "Mild fever, soreness",
        notes: "Third dose of injectable polio vaccine"
    },
    {
        name: "Rotavirus-3",
        code: "ROTA_3",
        weeks: 14,
        display: "14 Weeks",
        disease: "Rotavirus diarrhea",
        sideEffects: "Mild diarrhea, irritability",
        notes: "Third dose of rotavirus vaccine"
    },

    // 9 Months (36 weeks)
    {
        name: "MR (Measles-Rubella)",
        code: "MR",
        weeks: 36,
        display: "9 Months",
        disease: "Measles, Rubella",
        sideEffects: "Fever, rash, mild cough",
        notes: "Combined measles and rubella vaccine"
    },
    {
        name: "JE-1 (Japanese Encephalitis)",
        code: "JE_1",
        weeks: 36,
        display: "9 Months",
        disease: "Japanese Encephalitis",
        sideEffects: "Fever, headache, soreness",
        notes: "First dose (for endemic areas)"
    },

    // 12 Months (48 weeks)
    {
        name: "Hepatitis A-1",
        code: "HEP_A_1",
        weeks: 48,
        display: "12 Months",
        disease: "Hepatitis A",
        sideEffects: "Mild fever, soreness",
        notes: "First dose in hepatitis A series"
    },

    // 15 Months (60 weeks)
    {
        name: "MMR (Measles-Mumps-Rubella)",
        code: "MMR",
        weeks: 60,
        display: "15 Months",
        disease: "Measles, Mumps, Rubella",
        sideEffects: "Fever, rash, swollen glands",
        notes: "Combined vaccine for three diseases"
    },
    {
        name: "DTP Booster-1",
        code: "DTP_B1",
        weeks: 60,
        display: "15 Months",
        disease: "Diphtheria, Tetanus, Pertussis",
        sideEffects: "Fever, pain, irritability",
        notes: "First booster dose"
    },
    {
        name: "Hib Booster",
        code: "HIB_B",
        weeks: 60,
        display: "15 Months",
        disease: "Haemophilus influenzae type b",
        sideEffects: "Fever, pain at injection site",
        notes: "Booster dose for Hib"
    },
    {
        name: "OPV Booster",
        code: "OPV_B",
        weeks: 60,
        display: "15 Months",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "Booster dose of oral polio vaccine"
    },
    {
        name: "JE-2",
        code: "JE_2",
        weeks: 60,
        display: "15 Months",
        disease: "Japanese Encephalitis",
        sideEffects: "Fever, headache, soreness",
        notes: "Second dose (for endemic areas)"
    },

    // 18 Months (72 weeks)
    {
        name: "DTP Booster-2",
        code: "DTP_B2",
        weeks: 72,
        display: "18 Months",
        disease: "Diphtheria, Tetanus, Pertussis",
        sideEffects: "Fever, pain, irritability",
        notes: "Second booster dose"
    },
    {
        name: "Hib Booster-2",
        code: "HIB_B2",
        weeks: 72,
        display: "18 Months",
        disease: "Haemophilus influenzae type b",
        sideEffects: "Fever, pain at injection site",
        notes: "Second booster dose for Hib"
    },
    {
        name: "MMR-2",
        code: "MMR_2",
        weeks: 72,
        display: "18 Months",
        disease: "Measles, Mumps, Rubella",
        sideEffects: "Fever, rash, swollen glands",
        notes: "Second dose of MMR"
    },

    // 2 Years (96 weeks)
    {
        name: "Typhoid",
        code: "TYPHOID",
        weeks: 96,
        display: "2 Years",
        disease: "Typhoid fever",
        sideEffects: "Fever, headache, soreness",
        notes: "Conjugate vaccine recommended"
    },

    // 4-5 Years (208-260 weeks)
    {
        name: "DTP Booster-3",
        code: "DTP_B3",
        weeks: 208,
        display: "4-5 Years",
        disease: "Diphtheria, Tetanus, Pertussis",
        sideEffects: "Fever, pain, irritability",
        notes: "Third booster dose"
    },
    {
        name: "OPV Booster-2",
        code: "OPV_B2",
        weeks: 208,
        display: "4-5 Years",
        disease: "Polio",
        sideEffects: "Usually none",
        notes: "Second booster of oral polio vaccine"
    },

    // 10 Years
    {
        name: "Tdap/Td (Tetanus-Diphtheria)",
        code: "TDAP",
        weeks: 520,
        display: "10 Years",
        disease: "Tetanus, Diphtheria, Pertussis",
        sideEffects: "Fever, pain, headache",
        notes: "Pre-adolescent booster"
    },

    // 16 Years
    {
        name: "HPV (Human Papillomavirus)",
        code: "HPV",
        weeks: 832,
        display: "16 Years",
        disease: "Cervical cancer, genital warts",
        sideEffects: "Pain at injection site, fever",
        notes: "For girls (2-3 doses)"
    }
];

// Helper function to get vaccine by code
export const getVaccineByCode = (code) => {
    return INDIAN_VACCINATION_SCHEDULE.find(vaccine => vaccine.code === code);
};

// Helper function to get vaccines by age range
export const getVaccinesByAgeRange = (minWeeks, maxWeeks) => {
    return INDIAN_VACCINATION_SCHEDULE.filter(vaccine =>
        vaccine.weeks >= minWeeks && vaccine.weeks <= maxWeeks
    );
};

// Helper function to calculate due date from DOB
export const calculateDueDate = (dob, weeks) => {
    const dueDate = new Date(dob);
    dueDate.setDate(dueDate.getDate() + (weeks * 7));
    return dueDate;
};

// Helper function to get vaccine status
export const getVaccineStatus = (dueDate, completedDate) => {
    const today = new Date();
    const due = new Date(dueDate);

    if (completedDate) {
        return 'completed';
    }

    if (today.toDateString() === due.toDateString()) {
        return 'due_today';
    }

    if (today > due) {
        return 'overdue';
    }

    // If due within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    if (due <= sevenDaysFromNow) {
        return 'upcoming';
    }

    return 'pending';
};