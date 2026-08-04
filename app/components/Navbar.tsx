"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { ModeToggle } from "@/app/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import GetStartedButton from "@/features/auth/components/GetStartedButton";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          Gemini<span className="text-primary">LM</span>
        </Link>

        <div className="flex items-center gap-3">
          <ModeToggle />
          {isAuthenticated && user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Manage notebooks
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.name}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <GetStartedButton className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
              Sign in with Google
            </GetStartedButton>
          )}
        </div>
      </div>
    </nav>
  );
}
