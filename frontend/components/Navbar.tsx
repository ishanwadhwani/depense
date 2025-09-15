"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Button from "./ui/Button";

export default function Navbar() {
  const { isLoggedIn, isReady, logout, user } = useAuth();
  const { theme, toggle, isMounted } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Depense
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={toggle}>
          {isMounted ? (theme === "dark" ? "Light" : "Dark") : null}
        </Button>
        {!isReady ? null : !isLoggedIn ? (
          <>
            <Link href="/auth/login" className="">
              Login
            </Link>
            <Link href="/auth/signup" className="ml-2">
              Signup
            </Link>
          </>
        ) : (
          <>
            <span className="text-sm muted">Hi, {user?.name || "You"}</span>
            <Button onClick={handleLogout} className="cursor-pointer">
              Logout
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
