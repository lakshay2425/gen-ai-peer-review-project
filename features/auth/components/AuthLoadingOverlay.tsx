'use client';

interface AuthLoadingOverlayProps {
    message?: string;
}

export function AuthLoadingOverlay({ message = 'Signing you in...' }: AuthLoadingOverlayProps) {
    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">G</span>
                </div>
                <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium">{message}</p>
            </div>
        </div>
    );
}
