"use client";

import Navbar from "@/app/components/Navbar";
import NotebooksView from "@/features/notebooks/components/NotebooksView";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <NotebooksView />
        </div>
      </main>
    </div>
  );
}
