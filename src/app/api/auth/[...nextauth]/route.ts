import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// NextAuth config for App Router route handler
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    // Use default pages; can customize later
  },
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account?.provider === "google") {
        token.provider = "google";
      }
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token?.email) {
        session.user = session.user || ({} as any);
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  // Ensure correct NEXTAUTH_URL and NEXTAUTH_SECRET are set via env
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
