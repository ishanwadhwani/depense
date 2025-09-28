"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/Link";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";

type SignupFormInputs = {
  name: string;
  email: string;
  password: string;
};

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormInputs>();
  const { login } = useAuth();

  const onSubmit = async (data: SignupFormInputs) => {
    try {
      const res = await fetch("http://localhost:4000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Signup failed");
      }
      login(result.token, result.user);
      toast.push({
        type: "success",
        title: "Success",
        message: "Account created 🎉",
      });
      router.replace("/expenses");
    } catch (error) {
      console.error(error);
      toast.push({
        type: "error",
        title: "Error",
        message: "Signup failed. Try again later.",
      });
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white/60 shadow-md rounded-lg p-8 w-96">
        <h1 className="text-2xl font-bold mb-4">Signup</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            {...register("name", { required: "Name is required" })}
            className="border p-2 rounded"
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}

          <input
            type="email"
            placeholder="Email"
            {...register("email", { required: "Email is required" })}
            className="border p-2 rounded"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          <input
            type="password"
            placeholder="password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Min 8 characters required" },
            })}
            className="border p-2 rounded"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Signup
          </button>
        </form>
        <p className="text-sm mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
