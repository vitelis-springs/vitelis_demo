'use client';

import Link from "next/link";
import ThemeToggle from "../theme-toggle";
import { useAuthStore } from "../../stores/auth-store";

function GlobalNav() {
  const { isLoggedIn } = useAuthStore();

  // Hide navigation when user is logged in (sidebar handles navigation)
  if (isLoggedIn) {
    return null;
  }

  return (
    <nav className="sticky top-0 grid h-16 w-full grid-cols-2 items-center justify-center bg-[hsla(0,0%,100%,.8)] px-8 py-4 shadow-bottom backdrop-blur-sm backdrop-saturate-150">
      <div className="flex justify-start text-2xl text-gray-900">
        <Link href="/">Vitelis</Link>
      </div>

      <div className="flex justify-end gap-x-2 text-gray-500 items-center">
        <ThemeToggle />
      </div>
    </nav>
  );
}

export default GlobalNav;
