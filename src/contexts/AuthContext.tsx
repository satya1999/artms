import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPw: string, newPw: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const loginMut = useMutation(api.users.login);
  const changePasswordMut = useMutation(api.users.changePassword);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("artms_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("artms_user");
      }
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const result = await loginMut({ email, password });
        if (result) {
          const u = result as unknown as User;
          setUser(u);
          localStorage.setItem("artms_user", JSON.stringify(u));
          return true;
        }
        return false;
      } catch (err) {
        console.error("Login error:", err);
        return false;
      }
    },
    [loginMut],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("artms_user");
  }, []);

  const changePassword = useCallback(
    async (currentPw: string, newPw: string): Promise<void> => {
      if (!user) throw new Error("Not logged in");
      await changePasswordMut({
        userId: user.id,
        currentPassword: currentPw,
        newPassword: newPw,
      });
    },
    [changePasswordMut, user],
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
