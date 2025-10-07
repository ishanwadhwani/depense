import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";
import Footer from "@/components/Footer"

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
      <body className="min-h-screen flex flex-col overflow-x-hidden antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1 container mx-auto px-4">{children}</main>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
