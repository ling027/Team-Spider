import React, { createContext, useState, useEffect, useContext } from "react";
import { authAPI } from "../api/auth";
import type { User } from "../api/auth";

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  loading: boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);
          setIsLoggedIn(true);
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isLoggedIn");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("isLoggedIn", "true");
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");
    }
  };

  const updateUser = (userData: User) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const isAdmin = (): boolean => {
    return user?.isAdmin === true;
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, updateUser, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy use
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
};
