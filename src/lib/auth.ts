import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { logActivity } from "./activity-logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
        rememberMe: { label: "Beni Hatırla", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { clinic: true },
        });

        if (!user || !user.password) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          clinicId: user.clinicId,
          role: user.role,
          clinicPlan: user.clinic?.plan || "PRO",
          isDemo: user.isDemo || user.role === "DEMO",
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const cookieStore = cookies();
        const intent = cookieStore.get("google-auth-intent")?.value;

        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { id: true, clinicId: true },
        });

        if (intent === "register") {
          if (existingUser) {
            return "/register?error=AccountExists";
          }
          // Create user without clinic — registration will be completed at /register/complete
          await prisma.user.create({
            data: {
              name: profile.name || user.name || "",
              email: profile.email,
              image: user.image || null,
              isActive: true,
            },
          });
          return true;
        }

        // Default: login behavior — user must already exist
        if (!existingUser) {
          return "/login?error=NoAccount";
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Credentials sign-in
      if (user && account?.provider === "credentials") {
        token.sub = user.id;
        token.clinicId = (user as any).clinicId;
        token.role = (user as any).role;
        token.clinicPlan = (user as any).clinicPlan ?? "PRO";
        token.isDemo = (user as any).isDemo ?? false;
        token.rememberMe = (user as any).rememberMe ?? false;
        token.loginAt = Math.floor(Date.now() / 1000);
      }

      // Google sign-in: look up user by email (no adapter, so token.sub is Google ID)
      if (trigger === "signIn" && account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            id: true,
            role: true,
            clinicId: true,
            isDemo: true,
            clinic: { select: { plan: true } },
          },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.clinicId = dbUser.clinicId;
          token.clinicPlan = dbUser.clinic?.plan || "PRO";
          token.isDemo = dbUser.isDemo || dbUser.role === "DEMO";
        }
        token.rememberMe = true;
        token.loginAt = Math.floor(Date.now() / 1000);
      }

      // Re-check clinicId for Google-registered users who just completed registration
      if (trigger !== "signIn" && token.sub && token.clinicId === null) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: {
            clinicId: true,
            role: true,
            isDemo: true,
            clinic: { select: { plan: true } },
          },
        });
        if (dbUser?.clinicId) {
          token.clinicId = dbUser.clinicId;
          token.role = dbUser.role;
          token.clinicPlan = dbUser.clinic?.plan || "PRO";
          token.isDemo = dbUser.isDemo || dbUser.role === "DEMO";
        }
      }

      // Expire non-remember-me sessions after 24 hours
      if (token.loginAt && !token.rememberMe) {
        const age = Math.floor(Date.now() / 1000) - (token.loginAt as number);
        if (age > 24 * 60 * 60) {
          return {} as any;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).clinicId = token.clinicId;
        (session.user as any).role = token.role;
        (session.user as any).clinicPlan = token.clinicPlan ?? "PRO";
        (session.user as any).isDemo = token.isDemo ?? false;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        // Look up by email since user.id is Google's ID (no adapter)
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, clinicId: true },
        });
        if (dbUser) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastLoginAt: new Date() },
          });
          logActivity({
            userId: dbUser.id,
            clinicId: dbUser.clinicId,
            action: "LOGIN",
          });
        }
      } else if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { clinicId: true },
        });
        logActivity({
          userId: user.id,
          clinicId: dbUser?.clinicId,
          action: "LOGIN",
        });
      }
    },
  },
});
