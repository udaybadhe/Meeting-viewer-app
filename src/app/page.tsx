"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[24px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <div className="flex flex-col gap-4">
          {status === "loading" && (
            <span className="text-sm text-gray-500">Checking session…</span>
          )}
          {status !== "loading" && !session && (
            <button
              onClick={() => signIn("google")}
              className="rounded-md border border-black/[.08] dark:border-white/[.145] px-4 py-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
            >
              Sign in with Google
            </button>
          )}
          {session && (
            <div className="flex flex-col gap-2">
              <span className="text-sm">Signed in as {session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-black/[.08] dark:border-white/[.145] px-4 py-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
