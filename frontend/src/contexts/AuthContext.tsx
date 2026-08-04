import React, { createContext, useContext, useState, useEffect } from "react";
import { api, User } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password_hash: string) => Promise<void>;
  register: (email: string, name: string, password_hash: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (name?: string, avatar?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await api.auth.getMe();
        setUser(me);
      } catch (err) {
        console.error("Auth initialization failed", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password_hash: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password_hash);
      setUser(res.user);
    } catch (err) {
      setLoading(false);
      throw err;
    }
    setLoading(false);
  };

  const register = async (email: string, name: string, password_hash: string) => {
    setLoading(true);
    try {
      await api.auth.register(email, name, password_hash);
      // Auto login after registration
      const res = await api.auth.login(email, password_hash);
      setUser(res.user);
    } catch (err) {
      setLoading(false);
      throw err;
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (name?: string, avatar?: string) => {
    try {
      const updatedUser = await api.auth.updateMe(name, avatar);
      setUser(updatedUser);
    } catch (err) {
      console.error("Failed to update user profile", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
