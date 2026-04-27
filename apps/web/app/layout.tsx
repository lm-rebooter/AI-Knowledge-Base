import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Knowledge Base",
  description: "A full-stack AI knowledge base starter for learning modern web architecture."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
