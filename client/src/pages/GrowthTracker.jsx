import { useState, useEffect } from 'react';
import { format, differenceInMonths } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ScatterController
} from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import growthTrackerAPI from '../api/growthTrackerAPI.jsx';

import { FiAlertCircle, FiTrash2, FiInfo, FiHeart, FiSmile } from 'react-icons/fi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ScatterController,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Simple Tooltip Component for ℹ️ icons
// eslint-disable-next-line react/prop-types
const InfoTooltip = ({ text }) => (
  <div className="relative group inline-block ml-1 cursor-help">
    <FiInfo className="text-slate-400 dark:text-slate-400 hover:text-purple-500 w-4 h-4 inline" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const BalSathyaTracker = () => {
  const { user } = useSelector((state) => state.user);
  const [growthLogs, setGrowthLogs] = useState([]);
  // const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    height_cm: '',
    weight_kg: '',
    waterIntake_ml: '',
    milestone: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchLogs = async () => {
    try {
      const res = await growthTrackerAPI.getGrowthLogs({ childId: user?._id || 'default-child', sort: 'desc' });
      if (res.success) {
        setGrowthLogs(res.data);
      }
    } catch {
      toast.error('Failed to load growth entries');
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.height_cm || !formData.weight_kg) {
      toast.error('Height & Weight required');
      return;
    }

    try {
      const payload = {
        ...formData,
        childId: user?._id || 'default-child'
      };
      const res = await growthTrackerAPI.createGrowthLog(payload);
      if (res.success) {
        toast.success('Baby growth record saved 💖');
        setFormData({ height_cm: '', weight_kg: '', waterIntake_ml: '', milestone: '', date: format(new Date(), 'yyyy-MM-dd') });
        fetchLogs();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this specific record?")) return;
    try {
      await growthTrackerAPI.deleteGrowthLog(id);
      toast.success("Record deleted");
      setGrowthLogs(prev => prev.filter(log => log._id !== id));
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ WARNING: This will delete ALL saved growth logs for your child forever. Are you absolutely sure?")) return;
    try {
      await growthTrackerAPI.resetTracker(user?._id || 'default-child');
      toast.success("All tracker data reset completely.");
      setGrowthLogs([]);
    } catch {
      toast.error("Failed to reset tracker");
    }
  };

  const calculateAge = () => {
    if (!user?.dob) return 'Unknown Age';
    const months = differenceInMonths(new Date(), new Date(user.dob));
    if (months < 1) return '< 1 Month';
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      return `${years} yr${years > 1 ? 's' : ''} ${remMonths > 0 ? `${remMonths} mo` : ''}`;
    }
    return `${months} Months`;
  };

  // Sort logs ascending for charting
  const ascLogs = [...growthLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Auto-calculated BMI for the Input Section
  let inputBMI = null;
  let inputBMIExplanation = '';
  if (formData.weight_kg && formData.height_cm) {
    inputBMI = (parseFloat(formData.weight_kg) / Math.pow(parseFloat(formData.height_cm) / 100, 2)).toFixed(1);
    const numBMI = parseFloat(inputBMI);
    if (numBMI < 14) inputBMIExplanation = 'Slightly Underweight Zone 🟡. Focus on nutritious meals!';
    else if (numBMI > 18) inputBMIExplanation = 'Slightly Overweight Zone 🟡. Encourage active play!';
    else inputBMIExplanation = 'Healthy Zone 🟢. Perfect!';
  }

  // Nutrition Advice based on Age
  const getNutritionAdvice = () => {
    if (!user?.dob) return null;
    const months = differenceInMonths(new Date(), new Date(user.dob));
    if (months < 6) return { icon: '🤱', title: 'Feeding Advice', text: 'Exclusive breastfeeding is recommended until 6 months of age for optimal growth and immunity. Offer breastmilk on demand!' };
    if (months >= 6 && months < 12) return { icon: '🥣', title: 'Starting Solids', text: 'Time to introduce solid foods! Try mashed bananas, sweet potato puree, or soft cooked carrots alongside breastmilk. Offer small sips of water.' };
    return { icon: '🍱', title: 'Healthy Diet', text: 'Offer diverse, colorful meals! Include proteins, whole grains, and lots of soft fruits and veggies. Limit added sugars and salt.' };
  };
  const nutritionAdvice = getNutritionAdvice();

  // AI Insights from backend
  const latestLog = growthLogs[0];
  const aiStats = latestLog?.aiAnalysis;

  // CHART CONFIGURATIONS
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6 } },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { borderDash: [5, 5], color: '#f1f5f9' } },
    },
  };

  // A. Height Growth Line Chart
  const heightChartData = {
    labels: ascLogs.map(l => format(new Date(l.date), 'MMM dd')),
    datasets: [
      {
        label: "Your Child's Height (cm)",
        data: ascLogs.map(l => l.height_cm),
        borderColor: '#a855f7', // purple-500
        backgroundColor: 'rgba(168, 85, 247, 0.15)', // Light glow
        borderWidth: 4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#a855f7',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.5
      }
    ]
  };

  // B. Weight Growth Line Chart
  const weightChartData = {
    labels: ascLogs.map(l => format(new Date(l.date), 'MMM dd')),
    datasets: [
      {
        label: "Your Child's Weight (kg)",
        data: ascLogs.map(l => l.weight_kg),
        borderColor: '#ec4899', // pink-500
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        borderWidth: 4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#ec4899',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.5
      }
    ]
  };

  // C. BMI Trend Line Chart
  const bmiChartData = {
    labels: ascLogs.map(l => format(new Date(l.date), 'MMM dd')),
    datasets: [
      {
        label: 'BMI Score',
        data: ascLogs.map(l => l.bmi || (l.weight_kg / Math.pow(l.height_cm / 100, 2)).toFixed(1)),
        borderColor: '#8b5cf6', // violet-500
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#8b5cf6',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.5
      }
    ]
  };

  // D. Water Intake Tracking Chart (Bar)
  const waterChartData = {
    labels: ascLogs.map(l => format(new Date(l.date), 'MMM dd')),
    datasets: [
      {
        label: 'Water Intake (Glasses)',
        data: ascLogs.map(l => l.waterIntake_ml || 0),
        backgroundColor: 'rgba(56, 189, 248, 0.5)', // sky-400
        borderColor: '#38bdf8',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 'flex',
        maxBarThickness: 40
      }
    ]
  };

  // E. Height vs Weight Combined Comparison Chart (Scatter)
  const heightWeightScatterData = {
    datasets: [
      {
        label: 'Height vs Weight Correlation',
        data: ascLogs.map(l => ({ x: l.height_cm, y: l.weight_kg })),
        backgroundColor: '#f43f5e', // rose-500
        pointRadius: 8,
        pointHoverRadius: 10,
      }
    ]
  };
  const scatterOptions = {
    ...chartOptions,
    scales: {
      x: { title: { display: true, text: 'Height (cm)' }, grid: { borderDash: [5, 5] } },
      y: { title: { display: true, text: 'Weight (kg)' }, grid: { borderDash: [5, 5] } }
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => `Height: ${context.parsed.x}cm, Weight: ${context.parsed.y}kg`
        }
      }
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-gray-500">Please log in to view Growth Analytics.</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 pb-20 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-300/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">

        {/* Header Block */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-3xl shadow-lg mb-4">
            {user.kidName ? user.kidName.charAt(0).toUpperCase() : '👶'}
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-2">
            {user.kidName || 'Baby'}&apos;s Growth Tracker
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Age: <span className="font-bold">{calculateAge()}</span> • {user.gender || 'Unknown Gender'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12 relative z-10">
          {/* 1. INPUT SECTION */}
          <div className="lg:col-span-1 backdrop-blur-2xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 shadow-[0_8px_32px_rgba(147,51,234,0.1)] rounded-3xl p-6 transition-all hover:shadow-[0_8px_32px_rgba(147,51,234,0.2)]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <span className="text-2xl">📝</span> Log Today&apos;s Vitals
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  📅 Date
                </label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    📏 Height (cm)
                  </label>
                  <input type="number" step="0.1" placeholder="e.g. 65" value={formData.height_cm} onChange={e => setFormData({ ...formData, height_cm: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    ⚖️ Weight (kg)
                  </label>
                  <input type="number" step="0.1" placeholder="e.g. 7.5" value={formData.weight_kg} onChange={e => setFormData({ ...formData, weight_kg: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  💧 Water Intake (Glasses)
                  <InfoTooltip text="Babies under 6 months don't need water. Older babies need it! Log 0.5 or 1 normal glass." />
                </label>
                <input type="number" step="0.1" placeholder="e.g. 0.5 or 1 (Optional)" value={formData.waterIntake_ml} onChange={e => setFormData({ ...formData, waterIntake_ml: e.target.value })} className="w-full p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/60 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  🌟 New Milestone
                  <InfoTooltip text="Did they smile? Roll over? Take a first step? Record it here to celebrate!" />
                </label>
                <input type="text" placeholder="e.g. First word! (Optional)" value={formData.milestone} onChange={e => setFormData({ ...formData, milestone: e.target.value })} className="w-full p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/60 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
              </div>

              {/* Live BMI Calculator */}
              <div className="p-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl border border-white/60 dark:border-slate-700/60 shadow-inner">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center">
                    🎯 BMI Score <InfoTooltip text="BMI helps understand if your child is underweight, healthy, or overweight based on height and weight proportions." />
                  </span>
                  <span className="text-lg font-extrabold text-purple-600">{inputBMI || '--'}</span>
                </div>
                {inputBMIExplanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{inputBMIExplanation}</p>
                )}
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Save Tracker Log
              </button>
            </form>
          </div>

          {/* 2. SUMMARY INSIGHT CARD */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            {growthLogs.length > 0 ? (
              <div className="bg-gradient-to-br from-purple-100/80 to-pink-50/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/60 dark:border-slate-700/60 shadow-[0_8px_32px_rgba(236,72,153,0.15)] relative overflow-hidden transition-all hover:shadow-[0_8px_32px_rgba(236,72,153,0.25)]">
                <div className="absolute top-2 right-4 text-6xl opacity-20"><FiSmile /></div>
                <h3 className="text-2xl font-extrabold text-purple-900 mb-6 flex items-center gap-2">
                  <FiHeart className="text-pink-500 fill-pink-500" /> Smart Summary
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl backdrop-blur-sm border border-white dark:border-slate-700">
                    <div className="text-2xl mt-1">📈</div>
                    <div>
                      <h4 className="font-bold text-purple-800">Growth Status</h4>
                      <p className="text-slate-700 dark:text-slate-200">{aiStats?.explanation || "Your child's metrics are saved safely."}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl backdrop-blur-sm border border-white dark:border-slate-700">
                    <div className="text-2xl mt-1">🩺</div>
                    <div>
                      <h4 className="font-bold text-purple-800">Health Zone Indicator</h4>
                      <p className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        Currently tracking in the
                        <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full font-bold shadow-sm text-sm border-b-2 border-purple-200 text-purple-700">
                          {aiStats?.status || "Normal"}
                        </span>
                        zone.
                      </p>
                    </div>
                  </div>

                  {aiStats?.alert && (
                    <div className="flex items-start gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="text-2xl mt-1 text-red-500"><FiAlertCircle /></div>
                      <div>
                        <h4 className="font-bold text-red-800">Gentle Reminder</h4>
                        <p className="text-red-700 text-sm">{aiStats.alert}</p>
                      </div>
                    </div>
                  )}

                  {/* Nutrition Advice based on age */}
                  {nutritionAdvice && (
                    <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 rounded-xl border border-amber-100 mt-2">
                      <div className="text-2xl mt-1">{nutritionAdvice.icon}</div>
                      <div>
                        <h4 className="font-bold text-amber-800">{nutritionAdvice.title}</h4>
                        <p className="text-amber-700 text-sm leading-relaxed">{nutritionAdvice.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4 opacity-50">👶</div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No Records Yet</h3>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 max-w-sm">Enter your child&apos;s first height and weight using the form to generate their personalized growth charts and AI insights!</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. VISUAL GROWTH CHARTS GRID */}
        {growthLogs.length > 0 && (
          <div className="mb-12 relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-700/50 dark:border-slate-700/50 pb-2 flex items-center gap-2">
              <span className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl shadow-sm backdrop-blur-sm border border-white/60 dark:border-slate-700/60">📊</span> Easy-to-Read Growth Charts
            </h2>

            <div className="grid md:grid-cols-2 gap-6">

              {/* Chart A: Height */}
              <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 hover:bg-white/60 dark:bg-slate-800/60 transition-all duration-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">📏</span> Height Growth <InfoTooltip text="Tracks how tall your child is growing over time." />
                </h4>
                <div className="h-64"><Line data={heightChartData} options={chartOptions} /></div>
              </div>

              {/* Chart B: Weight */}
              <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 hover:bg-white/60 dark:bg-slate-800/60 transition-all duration-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">⚖️</span> Weight Growth <InfoTooltip text="Tracks your child's weight gain over time." />
                </h4>
                <div className="h-64"><Line data={weightChartData} options={chartOptions} /></div>
              </div>

              {/* Chart C: BMI */}
              <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 hover:bg-white/60 dark:bg-slate-800/60 transition-all duration-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">🎯</span> BMI Trend <InfoTooltip text="Body Mass Index relative to the dates recorded. Keep the line steady!" />
                </h4>
                <div className="h-64"><Line data={bmiChartData} options={chartOptions} /></div>
              </div>

              {/* Chart D: Water Intake */}
              <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 hover:bg-white/60 dark:bg-slate-800/60 transition-all duration-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">💧</span> Water Intake <InfoTooltip text="Monitor daily hydration levels if applicable." />
                </h4>
                <div className="h-64"><Bar data={waterChartData} options={chartOptions} /></div>
              </div>

              {/* Chart E: Height vs Weight (Full Width) */}
              <div className="md:col-span-2 backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 hover:bg-white/60 dark:bg-slate-800/60 transition-all duration-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">⚖️</span> Height-Weight Proportion <InfoTooltip text="Each dot represents a log. Shows how weight scales against height." />
                </h4>
                <div className="h-64"><Scatter data={heightWeightScatterData} options={scatterOptions} /></div>
              </div>

            </div>
          </div>
        )}

        {/* 4. PREVIOUS LOGS TABLE */}
        {growthLogs.length > 0 && (
          <div className="mb-12 relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-700/50 dark:border-slate-700/50 pb-2 flex items-center gap-2">
              <span className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl shadow-sm backdrop-blur-sm border border-white/60 dark:border-slate-700/60">📓</span> History Table
            </h2>
            <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm uppercase tracking-wider">
                      <th className="p-4">Date</th>
                      <th className="p-4">Height (cm)</th>
                      <th className="p-4">Weight (kg)</th>
                      <th className="p-4">BMI</th>
                      <th className="p-4">Water (Glasses)</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 text-slate-700 dark:text-slate-200 text-sm">
                    {growthLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/60 dark:bg-slate-800/60 transition-colors">
                        <td className="p-4 font-medium">{format(new Date(log.date), 'MMMM dd, yyyy')}</td>
                        <td className="p-4">
                          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold">{log.height_cm}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded-md font-bold">{log.weight_kg}</span>
                        </td>
                        <td className="p-4 font-bold">{log.bmi ? log.bmi.toFixed(1) : (log.weight_kg / Math.pow(log.height_cm / 100, 2)).toFixed(1)}</td>
                        <td className="p-4 text-sky-600 font-medium">{log.waterIntake_ml || '--'}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(log._id)} className="text-slate-400 dark:text-slate-400 hover:text-red-500 transition-colors p-2" title="Delete this entry">
                            <FiTrash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. DEVELOPMENTAL MILESTONES TABLE */}
        {growthLogs.filter(log => log.milestone?.trim()).length > 0 && (
          <div className="mb-12 relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-700/50 dark:border-slate-700/50 pb-2 flex items-center gap-2">
              <span className="p-2 bg-indigo-50/50 text-indigo-500 rounded-xl shadow-sm backdrop-blur-sm border border-white/60 dark:border-slate-700/60">🌟</span> Developmental Milestones
            </h2>
            <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-800/50 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/80 dark:border-slate-700/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-indigo-50/50 border-b border-indigo-100/50 text-indigo-800 font-bold text-sm uppercase tracking-wider">
                      <th className="p-4 w-1/4">Date Achieved</th>
                      <th className="p-4 w-3/4">Milestone Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 text-slate-700 dark:text-slate-200 text-sm">
                    {growthLogs.filter(log => log.milestone?.trim()).map((log) => (
                      <tr key={`milestone-${log._id}`} className="hover:bg-white/60 dark:bg-slate-800/60 transition-colors">
                        <td className="p-4 font-bold text-indigo-900/70">{format(new Date(log.date), 'MMMM dd, yyyy')}</td>
                        <td className="p-4">
                          <span className="inline-block bg-gradient-to-r from-amber-100 to-orange-50 text-amber-800 border border-amber-200/50 px-4 py-2 rounded-xl font-bold shadow-sm">
                            🎉 {log.milestone}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. RESET TRACKER OPTION */}
        {growthLogs.length > 0 && (
          <div className="flex justify-center border-t border-slate-200 dark:border-slate-700 pt-8 mt-12 mb-4">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-red-500 text-red-500 hover:bg-red-50 font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
            >
              <FiTrash2 className="group-hover:scale-110 transition-transform" /> Reset Entire Tracker Data
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default BalSathyaTracker;
