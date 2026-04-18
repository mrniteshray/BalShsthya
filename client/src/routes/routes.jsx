import { createBrowserRouter } from "react-router-dom";
import App from "../App";

// Pages
import HomePage from "../pages/Home";
import About from "../pages/About";
import Blog from "../pages/Blog";
import ContactUs from "../pages/ContactUs";
import News from "../pages/News";
import Contributors from "../pages/Contributors";
import Profile from "../pages/Profile";
import VideoRoom from "../pages/VideoRoom";
import Signin from "../pages/SignIn";
import Registration from "../pages/Registration";
import NotFoundPage from "../pages/NotFoundPage";
import CareCoPilot from "../pages/CareCoPilot";
import VaccineReminder from "../pages/VaccineReminder";
import GrowthTracker from "../pages/GrowthTracker";
import DoctorDetails from "../pages/DoctorDetails";
import LearningHub from "../pages/LearningHub";
import Services from "../pages/Services";

import ConsultationPage from "../pages/consult";
import DoctorDashboard from "../pages/DoctorDashboard";

// Components
import BabyFeeder from "../components/BabyFeeder";
import Sleeper from "../components/Sleeper";

import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";
import CookiePolicy from "../pages/CookiePolicy";
import OAuthSuccess from "../pages/OAuthSuccess";


// Protected Route Wrapper
import ProtectedRoute from "../components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <About /> },
      { path: "contactus", element: <ContactUs /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> },
      { path: "terms-of-service", element: <TermsOfService /> },
      { path: "cookie-policy", element: <CookiePolicy /> },

      /* --- Parent Protected Routes --- */
      {
        element: <ProtectedRoute allowedRoles={['parents', 'user']} />,
        children: [
          { path: "blog", element: <Blog /> },
          { path: "news", element: <News /> },
          { path: "contributors", element: <Contributors /> },
          { path: "babyfeeder", element: <BabyFeeder /> },
          { path: "sleeper", element: <Sleeper /> },
          { path: "care-co-pilot", element: <CareCoPilot /> },
          { path: "vaccine-reminder", element: <VaccineReminder /> },
          { path: "growth-tracker", element: <GrowthTracker /> },
          { path: "learning-hub", element: <LearningHub /> },
          { path: "services", element: <Services /> },
        ]
      },

      /* --- Shared Protected Routes (Doctor + Parent) --- */
      {
        element: <ProtectedRoute allowedRoles={['doctor', 'parents', 'user']} />,
        children: [
          { path: "doctor-dashboard", element: <DoctorDashboard /> },
          { path: "profile", element: <Profile /> },
          {
            path: "consultation",
            element: <ConsultationPage />,
            children: [
              {
                path: "doctordetail/:id",
                element: <DoctorDetails />,
              },
            ],
          },
          { path: "room/:roomId", element: <VideoRoom /> },
        ]
      },

      { path: "*", element: <NotFoundPage />, handle: { noLayout: true } },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
    handle: { noLayout: true },
  },
  { path: "/registration", element: <Registration /> },
  { path: "/signin", element: <Signin /> },
  { path: "/oauth-success", element: <OAuthSuccess /> }
]);

export default router;
