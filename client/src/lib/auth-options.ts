import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "./mongodb";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch the MongoDB user for a given email directly from the DB.
 */
async function getMongoUserByEmail(email: string) {
    try {
        const client = await clientPromise;
        const db = client.db(); // Uses the default DB from MONGODB_URI
        const user = await db.collection("users").findOne({ email });
        if (!user) return null;
        return {
            id: user._id.toString(),
            leetcode_username: user.leetcode_username,
            name: user.name || user.username,
            image: user.image
        };
    } catch {
        return null;
    }
}

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise, {
        collections: {
            Users: "users",
            Accounts: "accounts",
            Sessions: "sessions",
            VerificationTokens: "verification_tokens"
        },
    }),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    callbacks: {
        async signIn({ user, account }) {
            // NextAuth MongoDB Adapter handles user/account creation automatically.
            // However, if the user already existed (e.g., via credentials registration)
            // and had no image, we want to update their image from the OAuth provider.
            if (account?.type === "oauth" && user.email && user.image) {
                try {
                    const client = await clientPromise;
                    const db = client.db();
                    await db.collection("users").updateOne(
                        { email: user.email },
                        { $set: { image: user.image } }
                    );
                } catch (e) {
                    console.error("Failed to sync OAuth image to user", e);
                }
            }
            return true;
        },

        async jwt({ token, user, trigger }) {
            // On initial sign-in, user object is available (this is the user object from the DB adapter)
            if (user) {
                token.userId = user.id; // The MongoDB _id
                
                if (user.email) {
                    const dbUser = await getMongoUserByEmail(user.email);
                    if (dbUser) {
                        token.leetcode_username = dbUser.leetcode_username || null;
                        token.userName = dbUser.name || user.name || null;
                        token.picture = dbUser.image || token.picture || null;
                    }
                }
                token.userName = token.userName || (user as any).name || null;
                token.leetcode_username = token.leetcode_username || (user as any).leetcode_username || null;
            }

            // On session update, refresh user data
            if (trigger === "update" && token.email) {
                const dbUser = await getMongoUserByEmail(token.email as string);
                if (dbUser) {
                    token.userId = dbUser.id;
                    token.userName = dbUser.name || null;
                    token.leetcode_username = dbUser.leetcode_username || null;
                    token.picture = dbUser.image || token.picture || null;
                }
            }

            // Generate backend-compatible JWT using the MongoDB user ID
            const userId = token.userId as string | undefined;
            if (userId) {
                token.backendToken = jwt.sign(
                    { userId: userId },
                    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!,
                    { expiresIn: "7d" }
                );
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.userId || token.sub;
                (session.user as any).name = token.userName;
                (session.user as any).leetcode_username = token.leetcode_username;
                (session as any).backendToken = token.backendToken;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    events: {
        async createUser({ user }) {
            console.log("New OAuth user created:", user.email);
        },
    },
};
