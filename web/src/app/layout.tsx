import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watch Together — Synced Video + Webcam Chat",
  description: "Watch YouTube videos in real-time sync with friends while video chatting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
