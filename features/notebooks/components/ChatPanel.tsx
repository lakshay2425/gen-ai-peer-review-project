"use client";

import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <section className="flex-1 min-w-0 min-h-[420px] rounded-2xl border border-border bg-muted/30 p-6 sm:p-8 flex flex-col">
      <div className="mb-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Chat</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your sources. Click a citation to preview it.
        </p>
      </div>

      <div className="flex-1 rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">You</p>
          <p className="text-sm text-foreground leading-relaxed">
            What are the key takeaways from my sources?
          </p>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-xs font-medium text-primary mb-2">GeminiLM</p>
          <p className="text-sm text-foreground leading-relaxed">
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
          <p className="text-xs text-muted-foreground mt-3">
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
          <Input
            type="text"
            name="message"
            disabled={!chatEnabled}
            placeholder={
              chatEnabled
                ? "Ask a question about your sources..."
                : "Add and index at least one source to start chatting"
            }
            className="flex-1 rounded-full"
          />
          <Button type="submit" disabled={!chatEnabled}>
            Ask
          </Button>
        </form>
      </div>
    </section>
  );
}
