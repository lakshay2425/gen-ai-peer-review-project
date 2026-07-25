import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 pt-16 pb-20">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-6xl font-semibold tracking-tight text-gray-900 mb-4">
            4<span className="text-indigo-600">0</span>4
          </p>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-4">
            This page isn&apos;t in your notebook
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-10">
            The link may be broken, or the page may have been moved. Head back
            home and continue exploring your sources.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-base font-medium text-white hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center"
            >
              Back to home
            </Link>
            <Link
              href="/#sources"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
            >
              See what it does
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>
            Gemini<span className="text-indigo-600">LM</span>
          </span>
          <span>
            © {new Date().getFullYear()} GeminiLM. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
