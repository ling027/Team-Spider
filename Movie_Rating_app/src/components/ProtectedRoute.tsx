import { type ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ showAlert: true, alertMessage: "You must be logged in to access this page.", alertType: "warning" }} />;
  }

  return <>{children}</>;
}

export function SignedInProtection({ children }: ProtectedRouteProps): React.ReactElement {
  const { isLoggedIn } = useAuth();
  const prevIsLoggedIn = useRef(isLoggedIn);

  useEffect(() => {
    if (isLoggedIn && prevIsLoggedIn.current) {
      alert("You are already logged in.");
    }
    prevIsLoggedIn.current = isLoggedIn;
  }, [isLoggedIn]);

  if (isLoggedIn) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

export function AdminProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const { isLoggedIn, loading, isAdmin } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ showAlert: true, alertMessage: "You must be logged in to access this page.", alertType: "warning" }} />;
  }

  if (!isAdmin()) {
    return <Navigate to="/home" replace state={{ showAlert: true, alertMessage: "Access denied. Admin privileges required.", alertType: "error" }} />;
  }

  return <>{children}</>;
}