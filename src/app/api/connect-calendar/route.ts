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
    const user_id = uuidv4(); // Use email as user identifier
    const auth_config_id = process.env
      .COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID as string;

    const connectionRequest = await composio.connectedAccounts.initiate(
      user_id as string,
      auth_config_id as string,
      {
        callbackUrl: `http://localhost:3000/`,
      }
    );

    // Get the connection URL from the redirectUrl property
    const connectionUrl = connectionRequest.redirectUrl;
    console.log(connectionUrl);
    if (!connectionUrl) {
      return NextResponse.json(
        { error: "No connection URL available" },
        { status: 500 }
      );
    }

    const connectedAccount = await connectionRequest.waitForConnection();
    console.log(`Connection Established: ${connectedAccount.id}`);
    return NextResponse.json({
      success: true,
      connectionUrl,
      message:
        "Please visit the connection URL to authorize Google Calendar access",
    });
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
