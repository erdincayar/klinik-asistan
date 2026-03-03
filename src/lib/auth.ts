import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.clinicId = (user as any).clinicId;
        token.role = (user as any).role;
      }

      // On sign-in via OAuth, fetch role/clinicId from DB
      if (trigger === "signIn" && token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, clinicId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.clinicId = dbUser.clinicId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).clinicId = token.clinicId;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // When a new user is created via OAuth, set defaults
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        });
      }
    },
  },
});
