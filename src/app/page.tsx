"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetings, setMeetings] = useState<{ past: any[]; future: any[] } | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const connectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const res = await fetch("/api/connect-calendar", { method: "POST" });
      const data = await res.json();
      
      if (data.success && data.connectionUrl) {
        // Open the connection URL in a new window
        window.open(data.connectionUrl, "_blank", "width=600,height=600");
        setCalendarConnected(true);
        // Refresh meetings after a short delay
        setTimeout(() => {
          fetchMeetings();
        }, 2000);
      } else {
        setMeetingsError(data.error || "Failed to connect calendar");
      }
    } catch (e: any) {
      setMeetingsError(e?.message ?? "Failed to connect calendar");
    } finally {
      setConnectingCalendar(false);
    }
  };

  const fetchMeetings = async () => {
    if (status !== "authenticated") {
      setMeetings(null);
      return;
    }
    setLoadingMeetings(true);
    setMeetingsError(null);
    try {
      const res = await fetch("/api/meetings");
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.code === "CALENDAR_NOT_CONNECTED") {
          setMeetingsError("Google Calendar not connected");
          return;
        }
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setMeetings(data);
      setCalendarConnected(true);
    } catch (e: any) {
      setMeetingsError(e?.message ?? "Failed to load meetings");
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [status]);

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

              <div className="mt-4">
                <h2 className="font-semibold mb-2">Meetings</h2>
                
                {!calendarConnected && meetingsError === "Google Calendar not connected" && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Connect your Google Calendar to view meetings
                    </p>
                    <button
                      onClick={connectGoogleCalendar}
                      disabled={connectingCalendar}
                      className="rounded-md border border-black/[.08] dark:border-white/[.145] px-4 py-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] disabled:opacity-50"
                    >
                      {connectingCalendar ? "Connecting..." : "Connect Google Calendar"}
                    </button>
                  </div>
                )}

                {loadingMeetings && (
                  <div className="text-sm text-gray-500">Loading meetings…</div>
                )}
                {meetingsError && meetingsError !== "Google Calendar not connected" && (
                  <div className="text-sm text-red-600">{meetingsError}</div>
                )}
                {meetings && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="font-medium mb-1">Past (last 5)</h3>
                      <ul className="text-sm space-y-1">
                        {meetings.past.length === 0 && (
                          <li className="text-gray-500">No past meetings</li>
                        )}
                        {meetings.past.map((e) => (
                          <li key={e.id} className="truncate">
                            {e.summary} — {new Date(e.start).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Upcoming (next 5)</h3>
                      <ul className="text-sm space-y-1">
                        {meetings.future.length === 0 && (
                          <li className="text-gray-500">No upcoming meetings</li>
                        )}
                        {meetings.future.map((e) => (
                          <li key={e.id} className="truncate">
                            {e.summary} — {new Date(e.start).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
