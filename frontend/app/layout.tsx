import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Depense",
  description: "A simple expense sharing app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="container mx-auto px-4">{children}</main>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
