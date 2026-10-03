"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

import { login } from "../../lib/api";


export default function LoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const data = await login(password);

      // Store JWT
      sessionStorage.setItem(
        "fab_art_token",
        data.access_token
      );

      // Go to dashboard
      router.push("/dashboard");

    } catch (err) {
      setError(err.message || "Incorrect password.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#1c1c1a] flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#6f6b64] hover:text-[#1c1c1a] transition mb-12"
        >
          <ArrowLeft size={16} />
          Back
        </Link>


        {/* Brand */}
        <div className="mb-12">
          <p className="text-sm tracking-[0.3em] font-medium mb-8">
            FAB_ART
          </p>

          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            Studio Access
          </h1>

          <p className="mt-4 text-[#77736c]">
            Enter your password to access the private studio.
          </p>
        </div>


        {/* Login form */}
        <form onSubmit={handleSubmit}>

          <label
            htmlFor="password"
            className="block text-sm font-medium mb-3"
          >
            Password
          </label>


          <div className="relative">

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              className="w-full h-14 rounded-xl border border-[#d8d1c6] bg-white/60 px-4 pr-12 outline-none transition focus:border-[#1c1c1a] disabled:opacity-60"
            />


            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#77736c] hover:text-[#1c1c1a]"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>

          </div>


          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}


          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-6 rounded-xl bg-[#1c1c1a] text-white font-medium transition hover:bg-[#30302d] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Entering Studio..." : "Enter Studio"}
          </button>

        </form>

      </div>

    </main>
  );
}