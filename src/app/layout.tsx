import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSS Lab",
  description: "Calm practice, clear focus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
        {children}
      </body>
    </html>
  );
}
