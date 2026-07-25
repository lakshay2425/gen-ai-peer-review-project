"use client";

import { useGoogleAuth } from "../hooks/useGoogleOAuth";
import { useAuth } from "@/app/context/AuthContext";

type GetStartedButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export default function GetStartedButton({
  children,
  className,
}: GetStartedButtonProps) {
  const { handleGoogleLogin } = useGoogleAuth();
  const { isAuthenticating } = useAuth();

  return (
    <button
      type="button"
      onClick={() => handleGoogleLogin()}
      disabled={isAuthenticating}
      className={className}
    >
      {children}
    </button>
  );
}
