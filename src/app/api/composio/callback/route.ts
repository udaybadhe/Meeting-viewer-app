import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("Composio callback received:", { code, state, error });

  // Return an HTML page that will close the popup and notify the parent window
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Calendar Connection</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${
          error
            ? `
          <h2 class="error">Connection Failed</h2>
          <p>Error: ${error}</p>
        `
            : code
            ? `
          <h2 class="success">Connection Successful!</h2>
          <p>Your Google Calendar has been connected.</p>
          <div class="spinner"></div>
          <p>Closing window...</p>
        `
            : `
          <h2>Processing...</h2>
          <div class="spinner"></div>
        `
        }
      </div>
      
      <script>
        console.log('Callback script running...');
        console.log('Error:', ${error ? "'" + error + "'" : "null"});
        console.log('Code:', ${code ? "'" + code + "'" : "null"});
        console.log('Has opener:', !!window.opener);
        
        // Notify parent window and close popup
        if (window.opener) {
          console.log('Sending message to parent window...');
          if (${error ? "true" : "false"}) {
            console.log('Sending error message');
            window.opener.postMessage({ 
              type: 'calendar_auth_error', 
              error: '${error || "Unknown error"}' 
            }, '*');
          } else if (${code ? "true" : "false"}) {
            console.log('Sending success message');
            window.opener.postMessage({ 
              type: 'calendar_auth_success', 
              code: '${code}' 
            }, '*');
          }
          
          // Close the popup after a short delay
          setTimeout(() => {
            console.log('Closing popup...');
            window.close();
          }, 2000);
        } else {
          console.log('No opener, redirecting...');
          // If not in a popup, redirect to main page
          setTimeout(() => {
            window.location.href = '${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }';
          }, 2000);
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
