"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AuthModal } from "@/components/AuthModal/AuthModal";

interface AuthContextType {
  openLogin: () => void;
  closeLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);

  return (
    <AuthContext.Provider value={{ openLogin, closeLogin }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeLogin} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
