import type { ReactNode } from "react";
import "./init"; // Import initialization script
import { Raleway } from "next/font/google";

const raleway = Raleway({ 
  subsets: ["latin"],
  display: 'swap', // Prevent layout shift
  preload: true,   // Preload the font
});

export const metadata = {
  title: "Vitelis",
  description: "Company Analysis Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={raleway.className}>
        {children}
      </body>
    </html>
  );
}
