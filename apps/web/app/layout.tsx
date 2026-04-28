import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Knowledge Base",
  description: "Enterprise-ready AI knowledge base for document indexing, retrieval, and operational Q&A."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
