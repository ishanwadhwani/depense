"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type User = { id: string; name?: string; email?: string } | null;

type AuthContextType = {
  token: string | null;
  user: User;
  isLoggedIn: boolean;
  isReady: boolean;
  login: (token: string, user?: User) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthContextType["user"]>(null);

  const fetchMe = async (tok: string) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      const payload = await res.json();
      return payload.user ?? payload;
    } catch (err) {
      console.warn("fetchMe error:", err);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {}
        }

        if (storedToken && !storedUser) {
          const me = await fetchMe(storedToken);
          if (me) {
            setUser(me);
            try {
              localStorage.setItem("user", JSON.stringify(me));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = async (newToken: string, userObj?: User) => {
    setToken(newToken);
    try {
      localStorage.setItem("token", newToken);
      // if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
    } catch (err) {
      console.warn("localStorage error:", err);
    }

    if (userObj) {
      setUser(userObj);
      try {
        localStorage.setItem("user", JSON.stringify(userObj));
      } catch {}
      return;
    }

    const me = await fetchMe(newToken);
    if (me) {
      setUser(me);
      try {
        localStorage.setItem("user", JSON.stringify(me));
      } catch {}
    } else {
      setUser(null);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (err) {
      console.warn("localStorage error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token,
        isReady,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
