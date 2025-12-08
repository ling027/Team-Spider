import "../main.css";
import "./Login.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../api/auth";
import Alert from "../../components/Alert";

const Login: React.FC = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  // Check for alert from location state
  useEffect(() => {
    if (location.state?.showAlert) {
      setAlert({
        isOpen: true,
        message: location.state.alertMessage || "You must be logged in to access this page.",
        type: location.state.alertType || 'warning'
      });
      // Clear the state to prevent showing again on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle login submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await authAPI.login({
        username: formData.username,
        password: formData.password,
      });

      login(response.data.token, response.data.user);
      setMessage(`Welcome back, ${response.data.user.fullname || response.data.user.username}!`);
      setTimeout(() => navigate("/home"), 1000);
    } catch (error: any) {
      setMessage(error.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="body">
      <main className="login-page">
        <div className="login-container">
          <h1>{t("login")}</h1>

          <form onSubmit={handleSubmit}>
            <label htmlFor="username">{t("username")}</label>
            <br />
            <input
              type="text"
              className="login-input"
              name="username"
              placeholder={t("yourUsername")}
              value={formData.username}
              onChange={handleChange}
              required
            />
            <br />

            <label htmlFor="password">{t("password")}</label>
            <br />
            <input
              type="password"
              className="login-input"
              name="password"
              placeholder={t("yourPassword")}
              value={formData.password}
              onChange={handleChange}
              required
            />
            <br />

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : t("login")}
            </button>

            {message && (
              <p
                style={{
                  marginTop: "10px",
                  color: message.includes("❌") ? "#ff5555" : "#00ff88",
                }}
              >
                {message}
              </p>
            )}
          </form>

          <Link to="/signup" className="signup-link">
            {t("noAccount")}
          </Link>
        </div>
      </main>
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </div>
  );
};

export default Login;
