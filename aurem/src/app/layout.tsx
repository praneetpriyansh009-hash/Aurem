import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "AUREM — AI Study Companion",
    description:
        "The ultimate AI study companion for grades 9-12 and competitive exams. RAG-grounded, hallucination-resistant, conceptually gated learning.",
    keywords: ["AI tutor", "study companion", "JEE", "NEET", "SAT", "ACT", "IELTS", "TOEFL"],
    authors: [{ name: "AUREM" }],
    openGraph: {
        title: "AUREM — AI Study Companion",
        description: "Deep understanding + long-term retention. Not just quick answers.",
        type: "website",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="min-h-screen antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
