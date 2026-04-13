import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apogee Playground \u2014 Try the AI-era programming language",
  description:
    "Write, compile, and run Apogee programs in your browser. Compile-time null safety, constraint types, structured concurrency, and @intent annotations.",
  keywords: [
    "apogee",
    "programming language",
    "playground",
    "compiler",
    "AI",
    "type safety",
  ],
  openGraph: {
    title: "Apogee Playground",
    description:
      "The programming language built for the AI era. Try it in your browser.",
    siteName: "Apogee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apogee Playground",
    description:
      "Write, compile, and run Apogee programs in your browser. AI-era language with compile-time safety.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
