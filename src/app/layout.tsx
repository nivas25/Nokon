import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nokon",
  description:
    "YouTube is the storefront. Nokon turns a reel screenshot into a bounded Razorpay test order.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
