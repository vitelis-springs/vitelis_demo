import "@styles/global.css";
import { Raleway } from "next/font/google";
import type { ReactNode } from "react";
import Provider from "./provider";

const raleway = Raleway({ subsets: ["latin"] });

export const metadata = {
  title: "Vitelis",
  description: "",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={raleway.className}>
        <Provider>
      
          {children}
        
        </Provider>
      </body>
    </html>
  );
}
