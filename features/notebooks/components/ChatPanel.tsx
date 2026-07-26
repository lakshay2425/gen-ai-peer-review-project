"use client";

import toast from "react-hot-toast";
import CitationTrigger from "@/features/citations/components/CitationTrigger";
import { demoCitations } from "@/features/citations/demoCitations";
import type { Citation } from "@/features/citations/types";

type ChatPanelProps = {
  chatEnabled: boolean;
  onCitationClick: (citation: Citation) => void;
};

export default function ChatPanel({
  chatEnabled,
  onCitationClick,
}: ChatPanelProps) {
  const [youtube, pdf, text, website] = demoCitations;

  return (
    <section className="flex-1 min-w-0 min-h-[420px] rounded-2xl border border-gray-100 bg-gray-50 p-6 sm:p-8 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ask questions about your sources. Click a citation to preview it.
        </p>
      </div>

      <div className="flex-1 rounded-xl border border-gray-100 bg-white p-5 space-y-4">
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-400 mb-2">You</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            What are the key takeaways from my sources?
          </p>
        </div>

        <div className="rounded-xl bg-indigo-50/60 px-4 py-3">
          <p className="text-xs font-medium text-indigo-500 mb-2">GeminiLM</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Based on your materials, the main themes are grounded research
            workflows{" "}
            <CitationTrigger
              citation={text}
              label="[1]"
              onClick={onCitationClick}
            />
            , video walkthroughs starting at a specific moment{" "}
            <CitationTrigger
              citation={youtube}
              label="[2]"
              onClick={onCitationClick}
            />
            , document references on page 1{" "}
            <CitationTrigger
              citation={pdf}
              label="[3]"
              onClick={onCitationClick}
            />
            , and supporting web context{" "}
            <CitationTrigger
              citation={website}
              label="[4]"
              onClick={onCitationClick}
            />
            .
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Demo citations — replace with real AI responses later.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!chatEnabled) return;
            toast.success("It will be implemented soon");
            event.currentTarget.reset();
          }}
        >
          <input
            type="text"
            name="message"
            disabled={!chatEnabled}
            placeholder={
              chatEnabled
                ? "Ask a question about your sources..."
                : "Add and index at least one source to start chatting"
            }
            className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!chatEnabled}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </form>
      </div>
    </section>
  );
}
