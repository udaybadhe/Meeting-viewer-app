import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY as string,
    provider: new VercelProvider(),
  });

  // Check if user has connected Google Calendar
  // If not, return a specific error to trigger connection flow

  const now = new Date();
  const pastWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureWindowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    if (!process.env.COMPOSIO_API_KEY) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const connectionConfig = process.env.COMPOSIO_MCP_SERVER_ID
      ? { mcpServerId: process.env.COMPOSIO_MCP_SERVER_ID as string }
      : undefined;

    // Execute Google Calendar tool per Composio docs
    // Prefer a specific connected account if provided; otherwise use user_id
    const connected_account_id = process.env.COMPOSIO_CONNECTED_ACCOUNT_ID as
      | string
      | undefined;

    const result = await composio.tools.execute("GOOGLECALENDAR_EVENTS_LIST", {
      user_id: session.user.email as string, // Use email as user identifier
      arguments: {
        calendar_id: "primary",
        time_min: pastWindowStart.toISOString(),
        time_max: futureWindowEnd.toISOString(),
        max_results: 50,
        order_by: "startTime",
        single_events: true,
      },
      // @ts-ignore: connectionConfig support is provided by Composio core
      connectionConfig,
    } as any);

    // The response format depends on MCP tool. Normalize defensively.
    const items: any[] =
      (result as any)?.result?.items ||
      (result as any)?.items ||
      (result as any) ||
      [];

    const events = items
      .filter((e) => e && (e.start?.dateTime || e.start?.date))
      .map((e) => ({
        id: e.id,
        summary: e.summary || "(no title)",
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        hangoutLink: e.hangoutLink,
      }))
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

    const past = events.filter((e) => new Date(e.start) < now);
    const future = events.filter((e) => new Date(e.start) >= now);

    const past5 = past.slice(-5);
    const future5 = future.slice(0, 5);

    return NextResponse.json({ past: past5, future: future5 });
  } catch (err: any) {
    const status = err?.response?.status;
    const payload = err?.response?.data;
    const code = payload?.error?.code;
    const details = payload || err?.message || String(err);

    if (code === 1803 || /No connected account/i.test(String(details))) {
      return NextResponse.json(
        {
          error: "Google Calendar not connected",
          code: "CALENDAR_NOT_CONNECTED",
          hint: "Please connect your Google Calendar first.",
        },
        { status: 400 }
      );
    }

    if (code === 302 || /Auth config not found/i.test(String(details))) {
      return NextResponse.json(
        {
          error: "Google Calendar auth config not found in Composio",
          details,
          hint: "Set up Google Calendar auth configuration in Composio dashboard first, then try connecting.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch meetings", details },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
