import type { ReactNode } from "react";
import "./init"; // Import initialization script

export const metadata = {
  title: "Vitelis",
  description: "Company Analysis Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
