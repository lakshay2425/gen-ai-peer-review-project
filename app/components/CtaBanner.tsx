"use client";

import { useAuth } from "@/app/context/AuthContext";
import GetStartedButton from "@/features/auth/components/GetStartedButton";
import CreateNotebookButton from "@/features/notebooks/components/CreateNotebookButton";
import { useNotebooks } from "@/features/notebooks/hooks";

const primaryButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-60 w-full sm:w-auto";

const secondaryButtonClassName =
  "inline-flex items-center gap-2 rounded-full border border-gray-600 px-6 py-3 text-base font-medium text-gray-300 hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center";

function SeeWhatItDoesButton() {
  return (
    <a href="#sources" className={secondaryButtonClassName}>
      See what it does
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function CtaBanner() {
  const { isAuthenticated } = useAuth();
  const { data: notebooks } = useNotebooks({ enabled: isAuthenticated });

  const createLabel =
    notebooks && notebooks.length > 0
      ? "Create notebook"
      : "Create your first notebook";

  return (
    <section className="py-20 px-6 bg-gray-900">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-white mb-4">
          Ready to unlock your content?
        </h2>
        <p className="text-gray-400 mb-8">
          {isAuthenticated
            ? "Create a notebook and start adding your sources."
            : "Start for free. No credit card required."}
        </p>

        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <CreateNotebookButton
              label={createLabel}
              className={primaryButtonClassName}
            />
            <SeeWhatItDoesButton />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <GetStartedButton className={primaryButtonClassName}>
              <GoogleIcon />
              Continue with Google
            </GetStartedButton>
            <SeeWhatItDoesButton />
          </div>
        )}
      </div>
    </section>
  );
}
