import React, { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/slices/userSlice.jsx";
import {
  Home,
  User,
  BookOpen,
  Mail,
  Newspaper,
  Phone,
  Menu,
  X,
  Users,
  Heart,
  LogOut,
  UserCircle,
  TrendingUp,
  Syringe,
} from "lucide-react";
import { motion } from "framer-motion";
import navlogo from "/logo.png";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    dispatch(logout());
    navigate('/');
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  // Handle Logic: Scroll if on Home, Navigate if away
  const handleNavClick = (e, targetId) => {
    if (targetId.startsWith("#")) {
      e.preventDefault();
      const id = targetId.substring(1);

      if (location.pathname === "/") {
        // Already on home, just scroll
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          setIsMobileMenuOpen(false);
        }
      } else {
        // Navigate to home, then scroll (needs a small delay or hash in URL)
        navigate("/");
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    } else {
      // Standard navigation
      setIsMobileMenuOpen(false);
    }
  };

  const role = user?.role?.toLowerCase();
  console.log("--- HEADER DEBUG: role is ---", role);

  const navItems = [
    { to: "#home", label: "Home", icon: <Home className="w-4 h-4" />, roles: ['public', 'doctor', 'parents', 'user'] },
    { to: "/doctor-dashboard", label: "Dashboard", icon: <User className="w-4 h-4" />, roles: ['doctor'] },
    { to: "/consultation", label: "Consultation", icon: <Phone className="w-4 h-4" />, roles: ['parents', 'user'] },
    { to: "/blog", label: "Blog", icon: <BookOpen className="w-4 h-4" />, roles: ['parents', 'user'] },
    { to: "/news", label: "News", icon: <Newspaper className="w-4 h-4" />, roles: ['parents', 'user'] },
    { to: "/care-co-pilot", label: "Care Co-Pilot", icon: <Heart className="w-4 h-4" />, roles: ['parents', 'user'] },
    { to: "/growth-tracker", label: "Growth", icon: <TrendingUp className="w-4 h-4" />, roles: ['parents', 'user'] },
    { to: "/vaccine-reminder", label: "Vaccines", icon: <Syringe className="w-4 h-4" />, roles: ['parents', 'user'] },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!isAuthenticated) return item.roles.includes('public');
    if (item.roles.includes('public')) return true; // Home is always visible
    return item.roles.includes(role);
  });

  return (
    <>
      {/* HEADER */}
      <div
        className={`fixed top-0 left-0 h-[80px] flex items-center right-0 z-50 transition-all duration-300 
        ${isScrolled ? "shadow-md" : ""} 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700`}
      >
        <div className="w-full px-4 py-2">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            {/* Left Side: Logo + Nav */}
            <div className="flex items-center gap-8 lg:gap-12">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <img
                  src={navlogo}
                  alt="Logo"
                  className="h-10 w-10 lg:h-12 lg:w-12 rounded-full shadow-lg"
                />
                <div className="leading-tight mr-4 lg:mr-0">
                  <h1 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                    Balswasthya
                  </h1>
                  <p className="text-[10px] lg:text-xs text-gray-600 dark:text-gray-400">
                    Babycare
                  </p>
                </div>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                {visibleNavItems.map(({ to, label, icon }) => (
                  isScrolled || location.pathname !== "/" || !to.startsWith("#") ?
                    (
                      // Use standard Link or NavLink for external routes or when complex
                      <Link
                        key={to}
                        to={to.startsWith("#") ? "/" : to}
                        onClick={(e) => handleNavClick(e, to)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-all duration-300 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        {icon}
                        {label}
                      </Link>
                    ) : (
                      <a
                        key={to}
                        href={to}
                        onClick={(e) => handleNavClick(e, to)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-all duration-300 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        {icon}
                        {label}
                      </a>
                    )
                ))}
              </div>
            </div>

            {/* Right Side: Theme + Auth */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <div className="hidden lg:flex items-center">
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
              <div className="hidden lg:flex items-center gap-3">
                {isAuthenticated && user ? (
                  <>
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors">
                      <UserCircle className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        {user.name}
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 text-sm font-medium rounded-full transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      className="text-purple-600 hover:text-purple-700 font-medium px-4 py-2 transition"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/registration"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hamburger */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
                className="p-2 rounded-md bg-purple-100 dark:bg-gray-100 hover:bg-purple-200 dark:hover:bg-gray-200"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 " />
                ) : (
                  <Menu className="w-6 h-6 " />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isMobileMenuOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-xl lg:hidden"
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {visibleNavItems.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to.startsWith("#") ? "/" : to}
                  onClick={(e) => handleNavClick(e, to)}
                  className="flex items-center gap-3 p-3 rounded-lg mb-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {icon}
                  {label}
                </Link>
              ))}

              <div className="flex items-center justify-center p-3 mt-4">
                <ThemeToggle />
              </div>
            </div>

            <div className="p-4 border-t space-y-2">
              {isAuthenticated && user ? (
                <>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full mb-2 hover:bg-purple-100">
                    <UserCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      {user.name}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-600 px-4 py-2 rounded-full text-center text-sm font-medium hover:bg-red-600 hover:text-white transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-purple-600 border border-purple-600 px-4 py-2 rounded-full text-center text-sm font-medium hover:bg-purple-600 hover:text-white transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/registration"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-white rounded-full text-center text-sm font-semibold hover:scale-105 transition-transform"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
