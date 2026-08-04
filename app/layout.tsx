import type { Metadata } from "next";
import { Geist, Geist_Mono, Raleway, Manrope } from "next/font/google";
import Providers from "./providers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/app/providers/theme-providers"

const manropeHeading = Manrope({subsets:['latin'],variable:'--font-heading'});

const raleway = Raleway({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeminiLM — AI Research Companion",
  description:
    "Upload your sources — PDFs, text files, YouTube videos, and websites — and let AI turn them into interactive insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", raleway.variable, manropeHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
