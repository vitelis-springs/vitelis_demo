import type { ReactNode } from "react";
import { Raleway } from "next/font/google";
import StartupInitializer from "../components/startup-initializer";

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
        <StartupInitializer />
        {children}
      </body>
    </html>
  );
}
