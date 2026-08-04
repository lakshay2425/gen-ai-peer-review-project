import Navbar from "@/app/components/Navbar";
import HeroActions from "@/app/components/HeroActions";
import CtaBanner from "@/app/components/CtaBanner";
import { Badge } from "@/components/ui/badge";

const sources = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    label: "PDF Documents",
    description: "Research papers, e-books, reports, and any PDF file",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    label: "Text Files",
    description: "Plain text, markdown notes, drafts, and articles",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    ),
    label: "YouTube Videos",
    description: "Lectures, tutorials, interviews, and conference talks",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253M3 12a8.96 8.96 0 0 0 .284 2.253m0 0A11.978 11.978 0 0 0 12 16.5c2.81 0 5.384-.983 7.413-2.609"
        />
      </svg>
    ),
    label: "Website Links",
    description: "Documentation, blog posts, news articles, and web pages",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

const features = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
        />
      </svg>
    ),
    title: "Chat with your sources",
    description:
      "Ask questions and receive precise, grounded answers — every response is anchored to what you uploaded.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
        />
      </svg>
    ),
    title: "Instant summaries",
    description:
      "Get key takeaways, structured study guides, FAQs, and briefing docs generated from your content in seconds.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-8">
            AI-powered research, grounded in your sources
          </Badge>
          <h1 className="font-heading text-5xl sm:text-6xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            Turn any source into{" "}
            <span className="text-primary">deep insight</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Upload your research materials and let AI do the heavy lifting.
            Chat, summarize, and explore your content — all in one place.
          </p>
          <HeroActions />
        </div>
      </section>

      {/* Sources */}
      <section id="sources" className="py-20 px-6 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">
              Works with all your sources
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Bring content from anywhere. GeminiLM understands and unifies everything into a single, searchable notebook.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sources.map((source) => (
              <div
                key={source.label}
                className="rounded-2xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`inline-flex rounded-xl ${source.bg} ${source.color} p-3 mb-4`}
                >
                  {source.icon}
                </div>
                <h3 className="font-medium text-foreground mb-1.5">
                  {source.label}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">
              Everything you need to understand your content
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From quick summaries to deep conversations — GeminiLM adapts to how you work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-muted/30 p-8 flex flex-col gap-4"
              >
                <div className="inline-flex w-fit rounded-xl bg-primary/10 text-primary p-3">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            Gemini<span className="text-primary">LM</span>
          </span>
          <span>© {new Date().getFullYear()} GeminiLM. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
