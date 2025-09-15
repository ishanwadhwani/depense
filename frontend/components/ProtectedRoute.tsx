"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isLoggedIn) {
      router.push("/auth/login");
    }
  }, [isReady, isLoggedIn, router]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="text-gray-600">Checking authentication…</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
