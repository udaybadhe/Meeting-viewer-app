import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.COMPOSIO_API_KEY) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!process.env.COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID) {
    return NextResponse.json(
      {
        error: "COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID is not configured",
        hint: "Please set up Google Calendar auth config in Composio dashboard and add the Auth Config ID to your environment variables",
      },
      { status: 500 }
    );
  }

  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY as string,
    provider: new VercelProvider(),
  });

  try {
    // Create a connection request for Google Calendar using the Auth Config ID
    // Reuse existing cookie if present; otherwise generate a new stable identifier
    const existingCookie = req.cookies.get("composio_user_id")?.value;
    const user_id = existingCookie || uuidv4();
    const auth_config_id = process.env
      .COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID as string;

    const connectionRequest = await composio.connectedAccounts.initiate(
      user_id as string,
      auth_config_id as string,
      {
        callbackUrl: `http://localhost:3000/api/composio/callback`,
      }
    );

    // Get the connection URL from the redirectUrl property
    const connectionUrl = connectionRequest.redirectUrl;
    console.log("Connection URL:", connectionUrl);
    console.log("User ID:", user_id);
    console.log("Auth Config ID:", auth_config_id);

    if (!connectionUrl) {
      return NextResponse.json(
        { error: "No connection URL available" },
        { status: 500 }
      );
    }

    // Don't wait for connection here - let the user complete the OAuth flow first
    const res = NextResponse.json({
      success: true,
      connectionUrl,
      connectionId: connectionRequest.id,
      message: "Please complete the OAuth flow in the popup window",
    });

    // Persist the generated user_id in a cookie so subsequent API calls can use the same identifier
    // Use a short-ish maxAge; extend as needed
    res.cookies.set("composio_user_id", user_id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    const status = err?.response?.status;
    const payload = err?.response?.data;
    const code = payload?.error?.code;
    const details = payload || err?.message || String(err);

    if (code === 302 || /Auth config not found/i.test(String(details))) {
      return NextResponse.json(
        {
          error: "Google Calendar auth config not found in Composio",
          details,
          hint: "Set up Google Calendar auth configuration in Composio dashboard first.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create connection", details },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
