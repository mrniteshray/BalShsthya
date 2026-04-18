import GrowthLog from '../models/GrowthLog.js';
import User from '../models/user/user.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper for Parent-Friendly Growth Analysis
const generateAIAnalysis = (currentWeight, currentHeight, previousWeight, ageInMonths, bmi, waterIntake) => {
  let status = 'Normal ✅';
  let trend = 'Stable';
  let explanation = "Your child's height and weight are growing steadily 📈";
  let alert = null;

  // BMI Check
  if (bmi) {
    if (bmi < 14) {
      status = 'Underweight ⚠️';
      explanation = "BMI is slightly below the healthy range. Keep focusing on nutrition!";
    } else if (bmi > 18) {
      status = 'Overweight ⚠️';
      explanation = "BMI is above the healthy range. Encourage balanced meals and play!";
    } else {
      explanation = "BMI is in a healthy range ✅. Great job!";
    }
  }

  // Delta Check
  if (previousWeight !== undefined && previousWeight !== null) {
    const delta = currentWeight - previousWeight;
    if (delta < -0.1) {
      trend = 'Slight concern';
      status = 'Needs attention';
      alert = "Weight has dipped slightly since the last check. Monitor feeding.";
    } else if (delta > 0 && delta <= 1.5) {
      trend = 'Healthy';
    } else if (delta > 1.5) {
      trend = 'Growing fast';
    }
  }

  // Water Check
  if (waterIntake !== undefined && waterIntake !== null) {
    if (waterIntake < 500) {
      alert = (alert ? alert + ' ' : '') + "Water intake is below recommended level ⚠️";
    }
  }

  return { status, trend, explanation, alert };
};

// Create a new growth log entry
export const createGrowthLog = asyncHandler(async (req, res) => {
  const { childId, height_cm, weight_kg, milestone, notes, date, waterIntake_ml, bmi } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!childId || !height_cm || !weight_kg) {
    return res.status(400).json({
      success: false,
      message: 'Child ID, height, and weight are required'
    });
  }

  // Validate data ranges
  if (height_cm < 0 || height_cm > 200) {
    return res.status(400).json({
      success: false,
      message: 'Height must be between 0 and 200 cm'
    });
  }

  if (weight_kg < 0 || weight_kg > 100) {
    return res.status(400).json({
      success: false,
      message: 'Weight must be between 0 and 100 kg'
    });
  }

  const growthLog = await GrowthLog.create({
    userId,
    childId: childId || 'default-child', // Ensure fallback if missing on frontend
    height_cm,
    weight_kg,
    bmi,
    waterIntake_ml: waterIntake_ml || 0,
    milestone,
    notes,
    date: date || new Date()
  });

  // Calculate AI analysis for the exact response
  const previousLogs = await GrowthLog.find({ userId, childId: childId || 'default-child' }).sort({ date: -1 }).limit(2);
  let previousWeight = null;
  if (previousLogs.length > 1) {
    previousWeight = previousLogs[1].weight_kg;
  }
  const aiAnalysis = generateAIAnalysis(weight_kg, height_cm, previousWeight, null, bmi, waterIntake_ml);

  // Attach enrichment manually for the return
  const enrichedLog = {
    ...growthLog.toObject(),
    aiAnalysis
  };

  res.status(201).json({
    success: true,
    data: enrichedLog,
    message: 'Growth log created successfully'
  });
});

// Get all growth logs for a user
export const getGrowthLogs = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { childId, limit = 50, sort = 'desc' } = req.query;

  const query = { userId };
  if (childId) {
    query.childId = childId;
  }

  const sortOrder = sort === 'desc' ? -1 : 1;

  const rawGrowthLogs = await GrowthLog.find(query)
    .sort({ date: 1 }) // Always sort ascending first to calculate deltas
    .limit(limit === 'all' ? 0 : parseInt(limit))
    .select('-__v')
    .lean();

  let user = await User.findById(userId);
  let dob = user && user.dob ? new Date(user.dob) : null;

  let enrichedLogs = [];
  for (let i = 0; i < rawGrowthLogs.length; i++) {
    const log = rawGrowthLogs[i];
    const prevLog = i > 0 ? rawGrowthLogs[i - 1] : null;

    let ageInMonths = null;
    if (dob) {
      ageInMonths = (new Date(log.date).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    }

    const deltaWeight = prevLog ? (log.weight_kg - prevLog.weight_kg).toFixed(2) : 0;
    const deltaHeight = prevLog ? (log.height_cm - prevLog.height_cm).toFixed(2) : 0;
    const aiAnalysis = generateAIAnalysis(log.weight_kg, log.height_cm, prevLog ? prevLog.weight_kg : null, ageInMonths, log.bmi, log.waterIntake_ml);

    enrichedLogs.push({
      ...log,
      deltaWeight: parseFloat(deltaWeight),
      deltaHeight: parseFloat(deltaHeight),
      aiAnalysis,
      ageInMonths: ageInMonths ? ageInMonths.toFixed(1) : null
    });
  }

  // Sort according to request
  if (sortOrder === -1) {
    enrichedLogs.reverse();
  }

  res.status(200).json({
    success: true,
    count: enrichedLogs.length,
    data: enrichedLogs
  });
});

// Get a specific growth log by ID
export const getGrowthLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const growthLog = await GrowthLog.findOne({ _id: id, userId });

  if (!growthLog) {
    return res.status(404).json({
      success: false,
      message: 'Growth log not found'
    });
  }

  res.status(200).json({
    success: true,
    data: growthLog
  });
});

// Update a growth log
export const updateGrowthLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { height_cm, weight_kg, milestone, notes, date } = req.body;

  // Validate data ranges if provided
  if (height_cm !== undefined && (height_cm < 0 || height_cm > 200)) {
    return res.status(400).json({
      success: false,
      message: 'Height must be between 0 and 200 cm'
    });
  }

  if (weight_kg !== undefined && (weight_kg < 0 || weight_kg > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Weight must be between 0 and 100 kg'
    });
  }

  const growthLog = await GrowthLog.findOneAndUpdate(
    { _id: id, userId },
    { height_cm, weight_kg, milestone, notes, date },
    { new: true, runValidators: true }
  );

  if (!growthLog) {
    return res.status(404).json({
      success: false,
      message: 'Growth log not found'
    });
  }

  res.status(200).json({
    success: true,
    data: growthLog,
    message: 'Growth log updated successfully'
  });
});

// Delete a growth log
export const deleteGrowthLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const growthLog = await GrowthLog.findOneAndDelete({ _id: id, userId });

  if (!growthLog) {
    return res.status(404).json({
      success: false,
      message: 'Growth log not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Growth log deleted successfully'
  });
});

// Update reminder settings
export const updateReminderSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { childId, reminderEnabled, reminderFrequency } = req.body;

  if (!childId) {
    return res.status(400).json({
      success: false,
      message: 'Child ID is required'
    });
  }

  // Update all logs for this child with new reminder settings
  const result = await GrowthLog.updateMany(
    { userId, childId },
    { reminderEnabled, reminderFrequency }
  );

  res.status(200).json({
    success: true,
    message: 'Reminder settings updated successfully',
    updatedCount: result.modifiedCount
  });
});

// Get growth statistics
export const getGrowthStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { childId } = req.query;

  if (!childId) {
    return res.status(400).json({
      success: false,
      message: 'Child ID is required'
    });
  }

  const logs = await GrowthLog.find({ userId, childId })
    .sort({ date: 1 })
    .select('height_cm weight_kg date');
  // Note: Calculate logic stays here for historical mapping

  if (logs.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalEntries: 0,
        averageHeight: 0,
        averageWeight: 0,
        heightGrowth: 0,
        weightGrowth: 0,
        growthRate: 0
      }
    });
  }

  const totalEntries = logs.length;
  const averageHeight = logs.reduce((sum, log) => sum + log.height_cm, 0) / totalEntries;
  const averageWeight = logs.reduce((sum, log) => sum + log.weight_kg, 0) / totalEntries;

  // Calculate growth over time
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  const heightGrowth = lastLog.height_cm - firstLog.height_cm;
  const weightGrowth = lastLog.weight_kg - firstLog.weight_kg;

  // Calculate growth rate (cm per month)
  const timeDiff = (lastLog.date - firstLog.date) / (1000 * 60 * 60 * 24 * 30); // months
  const growthRate = timeDiff > 0 ? heightGrowth / timeDiff : 0;

  res.status(200).json({
    success: true,
    data: {
      totalEntries,
      averageHeight: Math.round(averageHeight * 100) / 100,
      averageWeight: Math.round(averageWeight * 100) / 100,
      heightGrowth: Math.round(heightGrowth * 100) / 100,
      weightGrowth: Math.round(weightGrowth * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      firstEntry: firstLog.date,
      lastEntry: lastLog.date
    }
  });
});

// Reset Tracker: Delete all growth logs for a child
export const resetGrowthLogs = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { childId } = req.params;

  if (!childId) {
    return res.status(400).json({ success: false, message: 'Child ID is required to reset tracker' });
  }

  try {
    const result = await GrowthLog.deleteMany({ userId, childId });
    res.status(200).json({
      success: true,
      message: `Tracker reset. Deleted ${result.deletedCount} entries.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset tracker' });
  }
});
