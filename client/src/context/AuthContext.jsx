import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import socket from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("resqnet_token"));
  const [loading, setLoading] = useState(true);

  // Set axios auth header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("resqnet_token", token);
    } else {
      delete api.defaults.headers.common["Authorization"];
      localStorage.removeItem("resqnet_token");
    }
  }, [token]);

  // Fetch user on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.data);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  useEffect(() => {
    if (!user) return;

    const userId = user.id || user._id;
    const assignedHospitalRaw = user.assignedHospital;
    const hospitalId =
      typeof assignedHospitalRaw === "string"
        ? assignedHospitalRaw
        : assignedHospitalRaw?._id;

    if (userId) {
      socket.emit("user:join", { userId });
    }

    if (user.role === "hospital" && hospitalId) {
      socket.emit("hospital:join", { hospitalId });
    }

    return () => {
      if (userId) {
        socket.emit("user:leave", { userId });
      }

      if (user.role === "hospital" && hospitalId) {
        socket.emit("hospital:leave", { hospitalId });
      }
    };
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    setToken(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const logout = () => {
    localStorage.removeItem("resqnet_user_location");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
