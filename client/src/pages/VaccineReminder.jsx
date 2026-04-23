import React, { useState, useEffect } from "react";
import { format, addWeeks, differenceInWeeks, differenceInDays } from "date-fns";
import axios from "axios";
import CONFIG from "../config.js";

const VaccineReminder = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [vaccinations, setVaccinations] = useState({
    pending: [],
    upcoming: [],
    overdue: [],
    completed: []
  });
  const [showChildForm, setShowChildForm] = useState(false);
  const [showMoreVaccines, setShowMoreVaccines] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);

  // Child registration form state
  const [childForm, setChildForm] = useState({
    child_name: '',
    dob: '',
    gender: '',
    weight: '',
    height: '',
    blood_group: '',
    medical_conditions: ''
  });

  useEffect(() => {
    fetchChildren();
    fetchReminders();
  }, []);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/children`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChildren(response.data.children);
      if (response.data.children.length > 0 && !selectedChild) {
        setSelectedChild(response.data.children[0]);
        fetchChildVaccinations(response.data.children[0]._id);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildVaccinations = async (childId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/children/${childId}/vaccinations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVaccinations(response.data.vaccinations);
    } catch (error) {
      console.error("Error fetching vaccinations:", error);
    }
  };

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/vaccination-reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(response.data.reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const handleChildSelect = (child) => {
    setSelectedChild(child);
    fetchChildVaccinations(child._id);
  };

  const handleCreateChild = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${CONFIG.BACKEND_URL}/api/children`, childForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setChildForm({
        child_name: '',
        dob: '',
        gender: '',
        weight: '',
        height: '',
        blood_group: '',
        medical_conditions: ''
      });
      setShowChildForm(false);
      fetchChildren();
      fetchReminders();
    } catch (error) {
      console.error("Error creating child:", error);
      alert("Error creating child profile");
    }
  };

  const handleCompleteVaccination = async (vaccinationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${CONFIG.BACKEND_URL}/api/vaccinations/${vaccinationId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchChildVaccinations(selectedChild._id);
      fetchReminders();
    } catch (error) {
      console.error("Error completing vaccination:", error);
      alert("Error marking vaccination as complete");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { class: 'badge-completed', text: '✅ Completed' },
      overdue: { class: 'badge-overdue', text: '⚠️ Overdue' },
      due_today: { class: 'badge-upcoming', text: '📅 Due Today' },
      upcoming: { class: 'badge-upcoming', text: '🔔 Due Soon' },
      pending: { class: 'badge-pending', text: '⏳ Pending' }
    };
    return badges[status] || badges.pending;
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const days = differenceInDays(due, today);
    return days;
  };

  const getCompletionRate = () => {
    const total = Object.values(vaccinations).flat().length;
    const completed = vaccinations.completed.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="vaccine-container">
        <div className="loading-spinner">Loading vaccination data...</div>
      </div>
    );
  }

  return (
    <div className="vaccine-container">
      <div className="header-section">
        <h1 className="title">🍼 Child Vaccination Tracker</h1>
        <p className="subtitle">Track your child's vaccination schedule and never miss an important dose</p>
      </div>

      {/* Dashboard Reminders */}
      {reminders.length > 0 && (
        <div className="reminders-section">
          <h2>🚨 Vaccination Alerts</h2>
          {reminders.map((reminder, index) => (
            <div key={index} className="reminder-card">
              <h3>{reminder.child.name} (Age: {reminder.child.age_weeks} weeks)</h3>
              <div className="reminder-stats">
                {reminder.overdue > 0 && <span className="urgent">⚠️ {reminder.overdue} Overdue</span>}
                {reminder.due_today > 0 && <span className="urgent">📅 {reminder.due_today} Due Today</span>}
                {reminder.due_soon > 0 && <span className="warning">🔔 {reminder.due_soon} Due Soon</span>}
              </div>
              {reminder.urgent_vaccines.length > 0 && (
                <div className="urgent-vaccines">
                  <strong>Urgent Vaccines:</strong>
                  <ul>
                    {reminder.urgent_vaccines.map((vaccine, idx) => (
                      <li key={idx} className={vaccine.status}>
                        {vaccine.name} - {format(new Date(vaccine.due_date), 'dd MMM yyyy')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Child Selection */}
      <div className="child-selection">
        <div className="child-list">
          <h2>Your Children</h2>
          {children.map((child) => (
            <div
              key={child._id}
              className={`child-card ${selectedChild?._id === child._id ? 'active' : ''}`}
              onClick={() => handleChildSelect(child)}
            >
              <h3>{child.child_name}</h3>
              <p>DOB: {format(new Date(child.dob), 'dd MMM yyyy')}</p>
              <p>Age: {Math.floor(differenceInWeeks(new Date(), new Date(child.dob)))} weeks</p>
            </div>
          ))}
          <button
            className="add-child-btn"
            onClick={() => setShowChildForm(true)}
          >
            ➕ Add Child
          </button>
        </div>
      </div>

      {/* Child Registration Form */}
      {showChildForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Register New Child</h2>
            <form onSubmit={handleCreateChild}>
              <div className="form-group">
                <label>Child Name *</label>
                <input
                  type="text"
                  required
                  value={childForm.child_name}
                  onChange={(e) => setChildForm({...childForm, child_name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={childForm.dob}
                  onChange={(e) => setChildForm({...childForm, dob: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <select
                  required
                  value={childForm.gender}
                  onChange={(e) => setChildForm({...childForm, gender: e.target.value})}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={childForm.weight}
                    onChange={(e) => setChildForm({...childForm, weight: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={childForm.height}
                    onChange={(e) => setChildForm({...childForm, height: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Blood Group</label>
                <select
                  value={childForm.blood_group}
                  onChange={(e) => setChildForm({...childForm, blood_group: e.target.value})}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Medical Conditions</label>
                <textarea
                  value={childForm.medical_conditions}
                  onChange={(e) => setChildForm({...childForm, medical_conditions: e.target.value})}
                  placeholder="Any allergies or medical conditions..."
                />
              </div>

              <div className="form-actions">
                <button type="submit">Register Child</button>
                <button type="button" onClick={() => setShowChildForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vaccination Dashboard */}
      {selectedChild && (
        <div className="vaccination-dashboard">
          <div className="dashboard-header">
            <h2>{selectedChild.child_name}'s Vaccination Schedule</h2>
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getCompletionRate()}%` }}
                ></div>
              </div>
              <span className="progress-text">{getCompletionRate()}% Complete</span>
            </div>
          </div>

          {/* Status Summary */}
          <div className="status-summary">
            <div className="status-card completed">
              <h3>{vaccinations.completed.length}</h3>
              <p>Completed</p>
            </div>
            <div className="status-card upcoming">
              <h3>{vaccinations.upcoming.length}</h3>
              <p>Due Soon</p>
            </div>
            <div className="status-card overdue">
              <h3>{vaccinations.overdue.length}</h3>
              <p>Overdue</p>
            </div>
            <div className="status-card pending">
              <h3>{vaccinations.pending.length}</h3>
              <p>Pending</p>
            </div>
          </div>

          {/* Overdue Vaccines Alert */}
          {vaccinations.overdue.length > 0 && (
            <div className="alert-section">
              <h3>⚠️ Overdue Vaccines - Please consult your doctor immediately!</h3>
              <p>You should have taken these vaccines already. Complete them as soon as possible.</p>
            </div>
          )}

          {/* Vaccine Categories */}
          <div className="vaccine-sections">
            {/* Upcoming Vaccines */}
            {(vaccinations.upcoming.length > 0 || vaccinations.overdue.length > 0) && (
              <div className="vaccine-section">
                <h3>🔔 Upcoming & Overdue Vaccines</h3>
                <div className="vaccine-grid">
                  {[...vaccinations.overdue, ...vaccinations.upcoming].slice(0, 10).map((vaccine) => (
                    <div key={vaccine._id} className="vaccine-card">
                      <div className="vaccine-header">
                        <h4>{vaccine.vaccine_name}</h4>
                        <span className={`status-badge ${getStatusBadge(vaccine.status).class}`}>
                          {getStatusBadge(vaccine.status).text}
                        </span>
                      </div>
                      <div className="vaccine-details">
                        <p><strong>Due:</strong> {format(new Date(vaccine.due_date), 'dd MMM yyyy')}</p>
                        <p><strong>Age:</strong> {vaccine.recommended_age_display}</p>
                        {getDaysUntilDue(vaccine.due_date) <= 7 && vaccine.status !== 'overdue' && (
                          <p className="urgent-text">
                            {getDaysUntilDue(vaccine.due_date) === 0 ? 'Due Today!' :
                             `${getDaysUntilDue(vaccine.due_date)} days left`}
                          </p>
                        )}
                      </div>
                      <div className="vaccine-actions">
                        <button
                          className="btn-details"
                          onClick={() => setSelectedVaccine(vaccine)}
                        >
                          View Details
                        </button>
                        {!vaccine.completed_date && (
                          <button
                            className="btn-complete"
                            onClick={() => handleCompleteVaccination(vaccine._id)}
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Vaccines */}
            {vaccinations.pending.length > 0 && (
              <div className="vaccine-section">
                <h3>⏳ Future Vaccines</h3>
                <div className="vaccine-grid">
                  {vaccinations.pending.slice(0, showMoreVaccines ? undefined : 10).map((vaccine) => (
                    <div key={vaccine._id} className="vaccine-card">
                      <div className="vaccine-header">
                        <h4>{vaccine.vaccine_name}</h4>
                        <span className={`status-badge ${getStatusBadge(vaccine.status).class}`}>
                          {getStatusBadge(vaccine.status).text}
                        </span>
                      </div>
                      <div className="vaccine-details">
                        <p><strong>Due:</strong> {format(new Date(vaccine.due_date), 'dd MMM yyyy')}</p>
                        <p><strong>Age:</strong> {vaccine.recommended_age_display}</p>
                      </div>
                      <div className="vaccine-actions">
                        <button
                          className="btn-details"
                          onClick={() => setSelectedVaccine(vaccine)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {vaccinations.pending.length > 10 && (
                  <button
                    className="btn-toggle-more"
                    onClick={() => setShowMoreVaccines(!showMoreVaccines)}
                  >
                    {showMoreVaccines ? 'Show Less' : `Show ${vaccinations.pending.length - 10} More Vaccines`}
                  </button>
                )}
              </div>
            )}

            {/* Completed Vaccines */}
            {vaccinations.completed.length > 0 && (
              <div className="vaccine-section">
                <h3>✅ Vaccination History</h3>
                <div className="completed-vaccines">
                  {vaccinations.completed.map((vaccine) => (
                    <div key={vaccine._id} className="completed-vaccine-item">
                      <div className="vaccine-info">
                        <h4>{vaccine.vaccine_name}</h4>
                        <p>Completed: {format(new Date(vaccine.completed_date), 'dd MMM yyyy')}</p>
                        <p>Due Date: {format(new Date(vaccine.due_date), 'dd MMM yyyy')}</p>
                      </div>
                      <span className="status-badge badge-completed">✅ Completed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vaccine Details Modal */}
      {selectedVaccine && (
        <div className="modal-overlay">
          <div className="modal-content vaccine-details-modal">
            <div className="modal-header">
              <h2>{selectedVaccine.vaccine_name}</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedVaccine(null)}
              >
                ×
              </button>
            </div>

            <div className="vaccine-details-content">
              <div className="detail-section">
                <h3>📅 Schedule Information</h3>
                <p><strong>Recommended Age:</strong> {selectedVaccine.recommended_age_display}</p>
                <p><strong>Due Date:</strong> {format(new Date(selectedVaccine.due_date), 'dd MMM yyyy')}</p>
                <p><strong>Status:</strong>
                  <span className={`status-badge ${getStatusBadge(selectedVaccine.status).class}`}>
                    {getStatusBadge(selectedVaccine.status).text}
                  </span>
                </p>
                {selectedVaccine.completed_date && (
                  <p><strong>Completed Date:</strong> {format(new Date(selectedVaccine.completed_date), 'dd MMM yyyy')}</p>
                )}
              </div>

              <div className="detail-section">
                <h3>🛡️ Disease Prevention</h3>
                <p>{selectedVaccine.disease_prevented}</p>
              </div>

              <div className="detail-section">
                <h3>💉 Side Effects</h3>
                <p>{selectedVaccine.side_effects}</p>
              </div>

              {selectedVaccine.notes && (
                <div className="detail-section">
                  <h3>📝 Notes</h3>
                  <p>{selectedVaccine.notes}</p>
                </div>
              )}

              <div className="modal-actions">
                {!selectedVaccine.completed_date && (
                  <button
                    className="btn-complete"
                    onClick={() => {
                      handleCompleteVaccination(selectedVaccine._id);
                      setSelectedVaccine(null);
                    }}
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  className="btn-close"
                  onClick={() => setSelectedVaccine(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .vaccine-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #2d2d64 40%, #5b21b6 100%);
          min-height: 100vh;
          color: white;
        }
        .vaccine-container::before {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(129, 140, 248, 0.18), transparent 28%),
                      radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.16), transparent 25%);
          pointer-events: none;
          z-index: -1;
        }

        .header-section {
          text-align: center;
          margin-bottom: 30px;
        }

        .title {
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 1.1rem;
          opacity: 0.85;
          color: #cbd5e1;
        }

        .reminders-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .reminder-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          border-left: 4px solid #ff6b6b;
        }

        .reminder-stats {
          display: flex;
          gap: 15px;
          margin: 10px 0;
        }

        .urgent {
          color: #ff6b6b;
          font-weight: bold;
        }

        .warning {
          color: #ffd93d;
          font-weight: bold;
        }

        .child-selection {
          margin-bottom: 30px;
        }

        .child-list {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: center;
        }

        .child-card {
          background: rgba(15, 23, 42, 0.85);
          border-radius: 10px;
          padding: 15px;
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease;
          border: 2px solid transparent;
          min-width: 200px;
          color: #e2e8f0;
        }

        .child-card:hover, .child-card.active {
          background: rgba(99, 102, 241, 0.2);
          border-color: #8b5cf6;
          transform: translateY(-2px);
        }

        .vaccine-card,
        .completed-vaccine-item,
        .reminder-card,
        .alert-section,
        .detail-section,
        .modal-content {
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .vaccine-card {
          background: rgba(15, 23, 42, 0.78);
        }

        .add-child-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 15px 20px;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 10px 30px rgba(99, 102, 241, 0.24);
        }

        .add-child-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(139, 92, 246, 0.25);
        }

        .btn-details,
        .btn-close {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
        }

        .btn-complete {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          color: white;
        }

        .btn-toggle-more {
          background: rgba(255, 255, 255, 0.1);
          color: #f8fafc;
        }

        .status-card.completed { border-left: 4px solid #22c55e; }
        .status-card.upcoming { border-left: 4px solid #60a5fa; }
        .status-card.overdue { border-left: 4px solid #f97316; }
        .status-card.pending { border-left: 4px solid #94a3b8; }

        .badge-completed { background: #22c55e; color: white; }
        .badge-overdue { background: #fb7185; color: white; }
        .badge-upcoming { background: #60a5fa; color: white; }
        .badge-pending { background: #94a3b8; color: white; }

        .add-child-btn {
          background: linear-gradient(45deg, #ff6b6b, #ffd93d);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 15px 20px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .add-child-btn:hover {
          transform: scale(1.05);
        }

        .vaccination-dashboard {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 30px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .progress-bar {
          width: 200px;
          height: 10px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-weight: bold;
          color: #c084fc;
        }

        .status-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .status-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }

        .status-card h3 {
          margin: 0;
          font-size: 2rem;
        }

        .status-card.completed { border-left: 4px solid #4ecdc4; }
        .status-card.upcoming { border-left: 4px solid #ffd93d; }
        .status-card.overdue { border-left: 4px solid #ff6b6b; }
        .status-card.pending { border-left: 4px solid #a8a8a8; }

        .alert-section {
          background: rgba(255, 59, 48, 0.2);
          border: 1px solid #ff6b6b;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 25px;
        }

        .vaccine-sections {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .vaccine-section h3 {
          color: #ffd89b;
          margin-bottom: 15px;
          font-size: 1.3rem;
        }

        .vaccine-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }

        .vaccine-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .vaccine-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.15);
        }

        .vaccine-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .vaccine-header h4 {
          margin: 0;
          font-size: 1.1rem;
          flex: 1;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          white-space: nowrap;
        }

        .badge-completed { background: #4ecdc4; color: white; }
        .badge-overdue { background: #ff6b6b; color: white; }
        .badge-upcoming { background: #ffd93d; color: black; }
        .badge-pending { background: #a8a8a8; color: white; }

        .vaccine-details p {
          margin: 5px 0;
          font-size: 0.9rem;
        }

        .urgent-text {
          color: #ff6b6b;
          font-weight: bold;
        }

        .vaccine-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-details, .btn-complete {
          padding: 8px 12px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .btn-details {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .btn-details:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-complete {
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          color: white;
        }

        .btn-complete:hover {
          transform: scale(1.05);
        }

        .btn-toggle-more {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 5px;
          padding: 10px 15px;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.3s ease;
        }

        .btn-toggle-more:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .completed-vaccines {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .completed-vaccine-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
        }

        .vaccine-info h4 {
          margin: 0 0 5px 0;
        }

        .vaccine-info p {
          margin: 2px 0;
          font-size: 0.85rem;
          opacity: 0.8;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: linear-gradient(135deg, #1e293b 0%, #3730a3 50%, #5b21b6 100%);
          border-radius: 15px;
          padding: 25px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          color: #c084fc;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          color: white;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vaccine-details-modal .vaccine-details-content {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .detail-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
        }

        .detail-section h3 {
          margin: 0 0 10px 0;
          color: #c084fc;
          font-size: 1.1rem;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-close {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 5px;
          padding: 10px 15px;
          cursor: pointer;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.95);
          color: #e2e8f0;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .form-group select {
          color: #e2e8f0;
          appearance: none;
          cursor: pointer;
          padding-right: 36px;
          background-image: 
            linear-gradient(to bottom, #e2e8f0 50%, #e2e8f0 50%),
            linear-gradient(to right, transparent 0%, transparent 100%);
          background-position: 
            calc(100% - 12px) calc(1em + 4px),
            0 0;
          background-size: 
            5px 5px,
            100% 100%;
          background-repeat: no-repeat;
        }

        .form-group select::-ms-expand {
          display: none;
        }

        .form-group select option {
          color: #0f172a;
          background: #f1f5f9;
          padding: 8px;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(226, 232, 240, 0.6);
        }

        .form-group input:hover,
        .form-group select:hover,
        .form-group textarea:hover {
          border-color: rgba(148, 163, 184, 0.5);
          background: rgba(30, 41, 59, 0.95);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #8b5cf6;
          background: rgba(30, 41, 59, 0.98);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
          outline: none;
        }

        .form-row {
          display: flex;
          gap: 15px;
        }

        .form-row .form-group {
          flex: 1;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .form-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .form-actions button[type="submit"] {
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          color: white;
        }

        .form-actions button[type="button"] {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .loading-spinner {
          text-align: center;
          padding: 50px;
          font-size: 1.2rem;
        }

        @media (max-width: 768px) {
          .vaccine-container {
            padding: 15px;
          }

          .title {
            font-size: 2rem;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .progress-bar {
            width: 150px;
          }

          .status-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .vaccine-grid {
            grid-template-columns: 1fr;
          }

          .child-list {
            flex-direction: column;
          }

          .child-card {
            min-width: auto;
          }

          .vaccine-actions {
            flex-direction: column;
          }

          .modal-content {
            width: 95%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default VaccineReminder;
