"use client";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = "Loading...",
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
