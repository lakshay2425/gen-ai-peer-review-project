"use client";

import { useAuth } from "@/app/context/AuthContext";
import GetStartedButton from "@/features/auth/components/GetStartedButton";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            Gemini<span className="text-indigo-600">LM</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <GetStartedButton className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60">
              Sign in with Google
            </GetStartedButton>
          )}
        </div>
      </div>
    </nav>
  );
}
