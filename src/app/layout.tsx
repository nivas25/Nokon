import type { Metadata } from "next";
import { Rethink_Sans, Figtree, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const rethinkSans = Rethink_Sans({ 
  subsets: ["latin"], 
  weight: ["600", "700", "800"],
  variable: "--font-rethink", 
});

const figtree = Figtree({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600"],
  variable: "--font-figtree", 
});

export const metadata: Metadata = {
  title: "Nokon Seller Platform",
  description: "Manage your social commerce storefront seamlessly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", rethinkSans.variable, figtree.variable, "font-sans", geist.variable)}>
      <body className="min-h-full antialiased bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
