"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutLink() {
  const clerk = useClerk();
  return (
    <button
      type="button"
      onClick={() => {
        void clerk.signOut({ redirectUrl: "/" });
      }}
      className="text-text-dim hover:text-text cursor-pointer bg-transparent text-sm"
    >
      Sign out
    </button>
  );
}
