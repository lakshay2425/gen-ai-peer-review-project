import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 pt-16 pb-20">
        <div className="max-w-lg mx-auto text-center">
          <p className="font-heading text-6xl font-semibold tracking-tight text-foreground mb-4">
            4<span className="text-primary">0</span>4
          </p>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
            This page isn&apos;t in your notebook
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            The link may be broken, or the page may have been moved. Head back
            home and continue exploring your sources.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
            >
              Back to home
            </Link>
            <Link
              href="/#sources"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors w-full sm:w-auto justify-center"
            >
              See what it does
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            Gemini<span className="text-primary">LM</span>
          </span>
          <span>
            © {new Date().getFullYear()} GeminiLM. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
