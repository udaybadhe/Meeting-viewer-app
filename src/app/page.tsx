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
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  const connectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const res = await fetch("/api/connect-calendar", { method: "POST" });
      const data = await res.json();
      
      if (data.success && data.connectionUrl) {
        setConnectionStatus("Opening authentication window...");
        
        // Open the connection URL in a new window with proper dimensions
        const popup = window.open(
          data.connectionUrl, 
          "google-calendar-auth", 
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );
        
        if (!popup) {
          setMeetingsError("Popup blocked. Please allow popups for this site and try again.");
          setConnectionStatus("");
          return;
        }

        setConnectionStatus("Please complete the Google Calendar authorization in the popup window...");

        // Monitor the popup window for closure (fallback)
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setConnectingCalendar(false);
            console.log('Popup closed, checking for connection...');
            // Always try to fetch meetings when popup closes
            setConnectionStatus("Popup closed. Checking connection...");
            setTimeout(() => {
              fetchMeetings();
              setConnectionStatus("");
            }, 2000);
          }
        }, 1000);

        // Set a timeout to close the popup after 5 minutes
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
            clearInterval(checkClosed);
            setConnectingCalendar(false);
            setConnectionStatus("");
            setMeetingsError("Authentication timed out. Please try again.");
          }
        }, 300000); // 5 minutes

      } else {
        setMeetingsError(data.error || "Failed to connect calendar");
        setConnectionStatus("");
      }
    } catch (e: any) {
      setMeetingsError(e?.message ?? "Failed to connect calendar");
    } finally {
      setConnectingCalendar(false);
    }
  };

  const fetchMeetings = async () => {
    console.log('fetchMeetings called, status:', status);
    if (status !== "authenticated") {
      console.log('Not authenticated, skipping fetchMeetings');
      setMeetings(null);
      return;
    }
    setLoadingMeetings(true);
    setMeetingsError(null);
    try {
      console.log('Fetching meetings...');
      const res = await fetch("/api/meetings");
      console.log('Meetings response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json();
        console.log('Meetings error data:', errorData);
        if (errorData.code === "CALENDAR_NOT_CONNECTED") {
          setMeetingsError("Google Calendar not connected");
          setCalendarConnected(false);
          return;
        }
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      console.log('Meetings data received:', data);
      setMeetings(data);
      setCalendarConnected(true);
      setMeetingsError(null); // Clear any previous errors
    } catch (e: any) {
      console.error('Error fetching meetings:', e);
      setMeetingsError(e?.message ?? "Failed to load meetings");
      setCalendarConnected(false);
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [status]);

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data, 'from origin:', event.origin);
      console.log('Current origin:', window.location.origin);
      
      // Allow messages from same origin or from the callback page
      if (event.origin !== window.location.origin && 
          !event.origin.includes('localhost:3000') && 
          !event.origin.includes('composio')) {
        console.log('Message rejected due to origin mismatch');
        return;
      }
      
      if (event.data.type === 'calendar_auth_success') {
        console.log('Calendar authentication successful');
        setConnectionStatus("Connection successful! Loading meetings...");
        setCalendarConnected(true);
        setConnectingCalendar(false);
        // Refresh meetings after a short delay
        setTimeout(() => {
          fetchMeetings();
          setConnectionStatus("");
        }, 1000);
      } else if (event.data.type === 'calendar_auth_error') {
        console.error('Calendar authentication failed:', event.data.error);
        setMeetingsError(`Authentication failed: ${event.data.error}`);
        setConnectionStatus("");
        setConnectingCalendar(false);
      }
    };

    console.log('Setting up message listener...');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('Removing message listener...');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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
                    {connectionStatus && (
                      <div className="mt-2 text-sm text-blue-600">
                        {connectionStatus}
                      </div>
                    )}
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
