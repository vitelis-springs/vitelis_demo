import "@styles/global.css";
import type { ReactNode } from "react";
import Provider from "./provider";
import GlobalLoader from "../../components/ui/global-loader";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <GlobalLoader />
      <Provider>
        {children}
      </Provider>
    </div>
  );
}
