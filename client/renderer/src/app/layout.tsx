'use client';
import localFont from "next/font/local";
import "./globals.css";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import sessionService from "../services/session"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();

  useEffect(() => {
    if (!sessionService.registed) {
      router.push("/user");
    }
  });

  return (
    <html lang="en">
      <head>
        <title>League of PRIDE</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
