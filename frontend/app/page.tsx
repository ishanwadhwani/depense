"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl font-bold text-gray-300 mb-4">Welcome to Depense</h1>
      <p className="text-lg text-gray-500 mb-6">
        The easiest way to record and share expenses with friends and groups.
      </p>

      {!isLoggedIn ? (
        <div className="flex gap-4">
          <Link
            href="/auth/signup"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="border border-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200"
          >
            Login
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-green-700 font-semibold">You&apos;re logged in! 🎉</p>
          <Link
            href="/groups"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Go to My Groups
          </Link>
        </div>
      )}
    </div>
  );
}
