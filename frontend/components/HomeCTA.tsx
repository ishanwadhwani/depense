"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function HomeCTA() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const ctaHref = isLoggedIn ? "/expenses" : "/auth/signup";
  //   const ctaHref2 = isLoggedIn ? "/logout" : "/auth/signup";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h3 className="text-2xl font-semibold">
          Ready to stop the awkward IOUs?
        </h3>
        <p className="muted mt-2">
          Create your first group in seconds and invite friends.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={ctaHref} className="btn-primary">
            {isLoggedIn ? "Go to My Expenses" : "Get started"}
          </Link>
          {isLoggedIn ? (
            <button onClick={handleLogout} className="btn-primary">
              Logout
            </button>
          ) : (
            <Link href="/auth/login" className="px-4 py-2 rounded border">
              Log in
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
