"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, AuthSession } from "@/lib/types";
import { getSession, getCurrentUser, login as storeLogin, logout as storeLogout, seedIfNeeded } from "@/lib/store";

interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    seedIfNeeded();
    const currentSession = getSession();
    const currentUser = getCurrentUser();
    setSession(currentSession);
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = storeLogin(email, password);
    if (!loggedInUser) {
      return { success: false, error: "Invalid email or password." };
    }
    setUser(loggedInUser);
    setSession(getSession());
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    storeLogout();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
