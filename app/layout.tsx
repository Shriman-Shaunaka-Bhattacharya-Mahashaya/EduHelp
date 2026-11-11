import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { themeScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "EduHelp",
  description: "Educational Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content" tabIndex={0}>Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
