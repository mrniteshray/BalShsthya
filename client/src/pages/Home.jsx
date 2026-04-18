import React, { useState, useEffect } from "react";
import {
  Heart,
  Shield,
  BookOpen,
  Users,
  Star,
  ArrowRight,
  Play,
  Sparkles,
  Baby,
  Phone,
  Calendar,
  Clock,
  Newspaper,
  CheckCircle,
  Mail,
  User,
  MessageCircle,
  Send,
  X,
  AlertTriangle,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay, Navigation } from "swiper/modules";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import AnimatedCounter from "../components/AnimatedCounter";
import toast from "react-hot-toast";
import axios from "axios";
import CONFIG from "../config.js";
import { addWeeks, differenceInDays, format } from "date-fns";

// --- Contact Form Input Component ---
const InputField = ({
  icon: Icon,
  name,
  value,
  error,
  isFocused,
  onChange,
  onFocus,
  onBlur,
  type = "text",
  placeholder,
  rows,
}) => {
  const Component = rows ? "textarea" : "input";

  return (
    <div className="relative">
      <Icon
        className={`absolute left-4 top-4 w-5 h-5 transition-colors duration-300 ${isFocused ? "text-indigo-600" : error ? "text-red-500" : "text-gray-400"
          }`}
      />

      <Component
        name={name}
        type={type}
        rows={rows}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl transition-all duration-300 bg-white text-black ${error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
          : isFocused
            ? "border-indigo-500 focus:border-indigo-600 focus:ring-indigo-500/20 shadow-lg"
            : "border-gray-200 hover:border-gray-300"
          } focus:outline-none focus:ring-4 ${rows ? "resize-none" : ""}`}
        style={{ backgroundColor: value === "" ? "#f3e8ff" : "white" }}
      />

      {error && <p className="mt-2 text-sm text-red-600 animate-slideIn">{error}</p>}
    </div>
  );
};

// Vaccine schedule data (same as in VaccineReminder)
const VACCINE_REMINDER_DAYS = 30; // Show popup for vaccines due within 30 days

const vaccineSchedule = [
  { name: "BCG", dueAfterWeeks: 0 },
  { name: "Hepatitis B (1st dose)", dueAfterWeeks: 6 },
  { name: "DTP (1st dose)", dueAfterWeeks: 10 },
  { name: "Hib (1st dose)", dueAfterWeeks: 14 },
  { name: "MMR", dueAfterWeeks: 36 },
  { name: "DTP Booster", dueAfterWeeks: 60 },
];

const vaccineInfo = {
  "BCG": "Bacillus Calmette-Guérin (BCG) vaccine protects against tuberculosis. It is given at birth and creates a small scar at the injection site.",
  "Hepatitis B (1st dose)": "Hepatitis B vaccine protects against liver infection caused by the hepatitis B virus. The first dose is given at 6 weeks.",
  "DTP (1st dose)": "Diphtheria, Tetanus, and Pertussis (DTP) vaccine protects against three serious diseases. The first dose is at 10 weeks.",
  "Hib (1st dose)": "Haemophilus influenzae type b (Hib) vaccine protects against meningitis and other infections. First dose at 14 weeks.",
  "MMR": "Measles, Mumps, and Rubella (MMR) vaccine protects against these three viral diseases. Given at 36 weeks (9 months).",
  "DTP Booster": "Booster dose of DTP to maintain immunity. Given at 60 weeks (15 months).",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const [isVisible, setIsVisible] = useState({});
  const [showVaccinePopup, setShowVaccinePopup] = useState(false);
  const [upcomingVaccine, setUpcomingVaccine] = useState(null);
  // Contact Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  // Check for upcoming vaccinations
  useEffect(() => {
    const checkUpcomingVaccinations = async () => {
      if (!isAuthenticated || !user || user.role === 'doctor') return;

      // Small delay to ensure component is fully mounted
      setTimeout(async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          const response = await axios.get(`${CONFIG.BACKEND_URL}/api/vaccinations`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const completedVaccinations = response.data.completedVaccinations || {};
          const vaccineBirthDate = response.data.vaccineBirthDate;

          if (!vaccineBirthDate) return;

          const birthDate = new Date(vaccineBirthDate);
          const today = new Date();
          const daysThreshold = VACCINE_REMINDER_DAYS; // Show popup for vaccines due within 30 days

          let closestVaccine = null;
          let minDaysDiff = Infinity;

          vaccineSchedule.forEach((vaccine) => {
            if (completedVaccinations[vaccine.name]) return; // Skip completed vaccines

            const dueDate = addWeeks(birthDate, vaccine.dueAfterWeeks);
            const daysUntilDue = differenceInDays(dueDate, today);

            // Check if due within threshold and not overdue by too much
            if (daysUntilDue >= 0 && daysUntilDue <= daysThreshold && daysUntilDue < minDaysDiff) {
              minDaysDiff = daysUntilDue;
              closestVaccine = {
                ...vaccine,
                dueDate,
                daysUntilDue,
                info: vaccineInfo[vaccine.name]
              };
            }
          });

          if (closestVaccine) {
            setUpcomingVaccine(closestVaccine);
            setShowVaccinePopup(true);
          }
        } catch (error) {
          console.error("Error checking vaccinations:", error);
          // Fallback to localStorage
          const localCompleted = localStorage.getItem("vaccinations_completed");
          const localBirthDate = localStorage.getItem("vaccinations_birthDate");

          if (localBirthDate && localCompleted) {
            const completedVaccinations = JSON.parse(localCompleted);
            const birthDate = new Date(localBirthDate);
            const today = new Date();
            const daysThreshold = VACCINE_REMINDER_DAYS;

            let closestVaccine = null;
            let minDaysDiff = Infinity;

            vaccineSchedule.forEach((vaccine) => {
              if (completedVaccinations[vaccine.name]) return;

              const dueDate = addWeeks(birthDate, vaccine.dueAfterWeeks);
              const daysUntilDue = differenceInDays(dueDate, today);

              if (daysUntilDue >= 0 && daysUntilDue <= daysThreshold && daysUntilDue < minDaysDiff) {
                minDaysDiff = daysUntilDue;
                closestVaccine = {
                  ...vaccine,
                  dueDate,
                  daysUntilDue,
                  info: vaccineInfo[vaccine.name]
                };
              }
            });

            if (closestVaccine) {
              setUpcomingVaccine(closestVaccine);
              setShowVaccinePopup(true);
            }
          }
        }
      }, 500); // 500ms delay to ensure component is fully mounted
    };

    checkUpcomingVaccinations();
  }, [isAuthenticated, user]);

  // --- Observation Logic ---
  const handleIntersection = (entries) => {
    entries.forEach((entry) => {
      setIsVisible((prev) => ({
        ...prev,
        [entry.target.id]: entry.isIntersecting,
      }));
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "-50px",
    });

    document.querySelectorAll("section[id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // --- Helper Components ---
  const FloatingElement = ({ children, delay = 0 }) => (
    <div
      className="animate-pulse"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: "3s",
      }}
    >
      {children}
    </div>
  );

  const GlassCard = ({ children, className = "", hover = true }) => (
    <div
      className={`
      backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl
      shadow-2xl transition-all duration-500 ease-out
      ${hover ? "hover:bg-white/20 hover:shadow-3xl " : ""}
      ${className}
    `}
    >
      {children}
    </div>
  );

  // --- Data: Home Services ---
  const homeServices = [
    {
      icon: <Calendar className="w-12 h-12" />,
      title: "Smart Vaccination Tracking",
      description:
        "AI-powered reminders and personalized schedules that adapt to your child's needs",
      color: "from-blue-500 to-purple-600",
      image:
        "https://res.cloudinary.com/dbnticsz8/image/upload/v1734934194/Infant%20care%20Compass/gheqjy0npqdkyhgqds43.png",
      link: "#",
    },
    {
      icon: <Phone className="w-12 h-12" />,
      title: "Instant Expert Care",
      description:
        "24/7 access to pediatric specialists with video consultations and real-time support",
      color: "from-emerald-500 to-teal-600",
      image:
        "https://res.cloudinary.com/dbnticsz8/image/upload/v1734935048/Infant%20care%20Compass/crqtr4wfu69wmqnulmja.png",
      link: "#",
    },
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: "Personalized Learning Hub",
      description:
        "Curated content that grows with your child, powered by developmental science",
      color: "from-pink-500 to-rose-600",
      image:
        "https://res.cloudinary.com/dbnticsz8/image/upload/v1734935847/Infant%20care%20Compass/yf0tea4dqhjf4ww3hjcz.png",
      link: "/learning-hub",
    },
  ];

  // --- Data: About Services ---
  const aboutServices = [
    {
      id: 1,
      title: "24/7 Consultation",
      icon: <Clock className="w-8 h-8" />,
      description:
        "We connect parents with pediatric experts for one-on-one virtual consultations, available around the clock.",
      gradient: "from-amber-400 via-orange-500 to-yellow-500",
      features: ["24/7 Availability", "Expert Pediatricians", "Virtual Consultations", "Emergency Support"],
    },
    {
      id: 2,
      title: "Childcare Education",
      icon: <BookOpen className="w-8 h-8" />,
      description:
        "Our platform offers a library of expertly curated articles and educational content, guiding parents at every stage.",
      gradient: "from-blue-500 via-purple-500 to-indigo-600",
      features: ["Curated Content", "Development Guides", "Safety Tips", "Nutrition Advice"],
    },
    {
      id: 3,
      title: "News and Updates",
      icon: <Newspaper className="w-8 h-8" />,
      description:
        "Stay informed with our regularly updated news section, featuring the latest developments in pediatric health.",
      gradient: "from-green-500 via-teal-500 to-cyan-600",
      features: ["Latest Updates", "Health News", "Safety Alerts", "Expert Insights"],
    },
    {
      id: 4,
      title: "AI-Driven First Aid",
      icon: <Heart className="w-8 h-8" />,
      description:
        "Our intelligent AI-powered first aid guide provides parents with step-by-step instructions for common issues.",
      gradient: "from-pink-500 via-rose-500 to-red-500",
      features: ["AI-Powered", "Step-by-Step Guide", "Emergency Response", "Instant Help"],
    },
  ];

  // --- Data: Stats ---
  const parseStat = (str) => {
    if (str === "24/7") return { value: 24, suffix: "/7", raw: str };
    const match = str.match(/([\d,.]+)(K)?([%+])?/i);
    if (!match) return { value: 0, suffix: "", raw: str };
    let value = parseFloat(match[1].replace(/,/g, ""));
    let suffix = "";
    if (match[2]) { value = value * 1000; suffix += "K"; }
    if (match[3]) { suffix += match[3]; }
    return { value, suffix, raw: str };
  };

  const stats = [
    { number: "50K+", label: "Happy Parents", icon: <Users className="w-6 h-6" /> },
    { number: "24/7", label: "Expert Support", icon: <Shield className="w-6 h-6" /> },
    { number: "98%", label: "Satisfaction Rate", icon: <Star className="w-6 h-6" /> },
    { number: "1000+", label: "Health Articles", icon: <BookOpen className="w-6 h-6" /> },
  ];

  // --- Data: Testimonials ---
  const testimonials = [
    {
      name: "Sarah Chen", role: "New Mom",
      content: "The AI-powered insights helped me understand my baby's needs like never before.",
      rating: 5, avatar: "https://images.unsplash.com/photo-1509868918748-a554ad25f858?w=100&h=100&fit=crop&crop=face",
    },
    {
      name: "Michael Rodriguez", role: "Father of Two",
      content: "The community support and expert consultations saved us countless sleepless nights.",
      rating: 5, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    },
    {
      name: "Emily Johnson", role: "Pediatric Nurse",
      content: "As a healthcare professional, I'm impressed by the accuracy and quality of information.",
      rating: 5, avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face",
    },
  ];

  // --- Contact Logic ---
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${CONFIG.BACKEND_URL}/api/contact-us`, formData);
      if (response.data && response.data.success) {
        toast.success("Message sent successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(response.data?.message || "Failed to send message.");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };


  return (
    <>
      {/* Vaccine Reminder Popup */}
      {showVaccinePopup && upcomingVaccine && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowVaccinePopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">Vaccine Reminder</h2>
              <p className="text-gray-600 mb-4">
                Your child needs the following vaccination soon!
              </p>

              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-lg text-blue-800 mb-2">
                  {upcomingVaccine.name}
                </h3>
                <p className="text-blue-700 mb-2">
                  Due Date: {format(upcomingVaccine.dueDate, "dd MMM yyyy")}
                </p>
                <p className="text-sm text-blue-600">
                  {upcomingVaccine.daysUntilDue === 0
                    ? "Due today!"
                    : `Due in ${upcomingVaccine.daysUntilDue} day${upcomingVaccine.daysUntilDue !== 1 ? 's' : ''}`}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                {upcomingVaccine.info}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVaccinePopup(false);
                    navigate('/vaccine-reminder');
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  View All Vaccines
                </button>
                <button
                  onClick={() => setShowVaccinePopup(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Remind Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white overflow-hidden ">

        {/* --- HERO SECTION --- */}
        <section id="home" className="relative min-h-screen flex items-center justify-center px-6 pt-20">
          {/* Animated Background Elements */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
          </div>

          <div className="relative z-10 text-center max-w-6xl mx-auto">
            <FloatingElement>
              <div className="mb-8">
                <Baby className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" style={{ animationDuration: "4s" }} />
              </div>
            </FloatingElement>

            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight">
                <span className="inline-block bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent transition-all duration-300 hover:text-shadow-glow hover:scale-110 cursor-pointer">
                  Balswasthya
                </span>
                <br />
                <span className="text-5xl md:text-7xl lg:text-8xl bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent inline-block transition-all duration-300 hover:text-shadow-glow-pink hover:scale-110 cursor-pointer">
                  BabyCare
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed max-w-3xl mx-auto">
                Revolutionary AI-powered platform transforming how parents navigate their child's early years with
                <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-semibold"> confidence</span>,
                <span className="text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text font-semibold"> support</span>, and
                <span className="text-transparent bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text font-semibold"> love</span>.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
                <button
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30"
                  onClick={() => navigate("/signin")}
                >
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  className="group flex items-center gap-3 px-6 py-4 backdrop-blur-sm bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-all duration-300"
                  onClick={() => document.getElementById("demo").scrollIntoView({ behavior: "smooth" })}
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </button>
              </div>
            </div>
          </div>

          {/* Floating Cards (Hidden on mobile) */}
          <div className="absolute top-20 left-10 hidden lg:block">
            <FloatingElement delay={0.5}>
              <GlassCard className="p-4 w-48">
                <div className="flex items-center gap-3">
                  <Heart className="w-8 h-8 text-pink-400" />
                  <div>
                    <p className="font-semibold">98% Satisfaction</p>
                    <p className="text-sm text-gray-400">Happy Parents</p>
                  </div>
                </div>
              </GlassCard>
            </FloatingElement>
          </div>
        </section>

        {/* --- ABOUT SECTION (Merged) --- */}
        <section id="about" className="py-20 relative overflow-hidden">
          {/* Stats */}
          <div className="container mx-auto max-w-6xl px-4 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const { value, suffix } = parseStat(stat.number);
                return (
                  <div key={index} className="text-center group">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                      <div className="text-purple-400 mb-2 flex justify-center group-hover:scale-110 transition-transform duration-300">
                        {stat.icon}
                      </div>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                        <AnimatedCounter
                          target={value}
                          duration={1500}
                          format={(n) => {
                            if (suffix === "K+") return `${Math.round(n / 1000)}K+`;
                            if (suffix === "/7") return `${Math.round(n)}/7`;
                            if (suffix === "%") return `${Math.round(n)}%`;
                            if (suffix === "+") return `${Math.round(n)}+`;
                            return Math.round(n);
                          }}
                          start={isVisible["about"]}
                        />
                      </div>
                      <div className="text-gray-300 text-sm">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                What We Do
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Comprehensive care solutions designed to support you at every step of your parenting journey
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {aboutServices.map((service, index) => (
                <div
                  key={service.id}
                  className="group relative overflow-hidden rounded-2xl transition-all duration-700 hover:scale-105"
                  onMouseEnter={() => setActiveCard(service.id)}
                  onMouseLeave={() => setActiveCard(null)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 p-8 h-full">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${service.gradient} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white">{service.icon}</div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-purple-200 transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-gray-300 text-lg leading-relaxed mb-6">
                      {service.description}
                    </p>
                    <div className="space-y-3">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 group-hover:text-white transition-colors">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SERVICES / HIGHLIGHTS SECTION (Original Home Swiper) --- */}
        <section id="services" className="py-32 relative overflow-x-visible z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Platform Highlights
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Discover how our cutting-edge technology transforms childcare into an intuitive experience.
              </p>
            </div>
            <Swiper
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={"auto"}
              coverflowEffect={{ rotate: 30, stretch: 0, depth: 200, modifier: 1, scale: 0.9, slideShadows: true }}
              autoplay={{ delay: 2500, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              modules={[EffectCoverflow, Pagination, Autoplay]}
              className="w-full max-w-6xl mx-auto"
            >
              {homeServices.map((service, index) => (
                <SwiperSlide key={index} className="!w-80 !flex-shrink-0">
                  <GlassCard className="p-6 text-white text-center h-full">
                    <div className={`bg-gradient-to-br ${service.color} p-4 rounded-full inline-block`}>
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-bold mt-4">{service.title}</h3>
                    <p className="text-white-600 mt-2">{service.description}</p>
                    <div className="overflow-hidden rounded-xl mt-4 h-40">
                      <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                    </div>
                    <Link to={service.link} className="mt-4 block text-blue-400 font-medium hover:text-blue-300">
                      Learn More →
                    </Link>
                  </GlassCard>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* --- EXPERIENCE SECTION --- */}
        <section className="py-32 relative bg-black/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-pink-400 via-pink-300 to-purple-400 bg-clip-text text-transparent">
                  Creating Magical Childhood Moments
                </h2>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Every smile, every milestone, every precious moment deserves to be celebrated and supported with the best care possible.
                </p>
                <button
                  onClick={() => navigate("/signin")}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-4 rounded-full font-semibold text-white shadow-md hover:scale-105 transition-all"
                >
                  Join Our Community
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <div className="group relative overflow-hidden rounded-2xl">
                    <img src="https://img.freepik.com/premium-photo/happy-family-with-newborn-baby_52137-18298.jpg" alt="Family" className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- DEMO SECTION --- */}
        <section id="demo" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">See It In Action</h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">Watch our quick demo to see how Balswasthya Babycare makes parenting easier.</p>
            </div>
            <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black/20 aspect-w-16 aspect-h-9" style={{ minHeight: "500px" }}>
              {/* Placeholder for video */}
              <div className="flex items-center justify-center h-full w-full absolute inset-0 text-white">
                <Play className="w-20 h-20 opacity-50" />
              </div>
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Voices of Trust</h2>
            </div>
            <Swiper
              slidesPerView={1}
              spaceBetween={30}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              breakpoints={{ 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
              modules={[Autoplay, Pagination]}
              className="w-full pb-10"
            >
              {testimonials.map((t, i) => (
                <SwiperSlide key={i}>
                  <GlassCard className="p-8 relative group">
                    <div className="flex items-center gap-2 mb-4">
                      {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-gray-300 mb-6 italic">"{t.content}"</p>
                    <div className="flex items-center gap-4">
                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                      <div><div className="font-semibold">{t.name}</div><div className="text-gray-400 text-sm">{t.role}</div></div>
                    </div>
                  </GlassCard>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* --- CONTACT SECTION (Merged) --- */}
        <section id="contact" className="py-20 relative">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-6 shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Let's Connect
              </h2>
              <p className="text-lg text-gray-300">Have questions? We'd love to hear from you.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <InputField icon={User} name="name" placeholder="Full Name" value={formData.name} error={errors.name} isFocused={focusedField === "name"} onChange={handleChange} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
                <InputField icon={Mail} name="email" type="email" placeholder="Email Address" value={formData.email} error={errors.email} isFocused={focusedField === "email"} onChange={handleChange} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
              </div>
              <div className="space-y-6">
                <InputField icon={MessageCircle} name="subject" placeholder="Subject" value={formData.subject} error={errors.subject} isFocused={focusedField === "subject"} onChange={handleChange} onFocus={() => setFocusedField("subject")} onBlur={() => setFocusedField(null)} />
                <InputField icon={MessageCircle} name="message" rows={4} placeholder="Message" value={formData.message} error={errors.message} isFocused={focusedField === "message"} onChange={handleChange} onFocus={() => setFocusedField("message")} onBlur={() => setFocusedField(null)} />
              </div>
              <div className="pt-8 text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full md:w-auto py-4 px-12 rounded-xl font-semibold text-white transition-all duration-300 transform ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg"
                    }`}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* --- FOOTER CTA --- */}
        <section className="py-20 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start?</h2>
          <button onClick={() => navigate("/signin")} className="bg-white text-purple-900 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition">Get Started Now</button>
        </section>

      </div>
    </>
  );
};

export default HomePage;
