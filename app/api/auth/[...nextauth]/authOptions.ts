import {type DefaultSession, NextAuthOptions, User} from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google";
import {Provider} from "next-auth/providers";
import {createUser} from "@/app/api/users/route";

declare module 'next-auth' {
    interface Session {
        user: {
            /** The user's id. */
            id: string
        } & DefaultSession['user']
    }
}

const providerTypes = process.env.EIDOLON_AUTH_PROVIDERS?.split(',') || []

const providers: Provider[] = []

if (providerTypes.includes('github')) {
    providers.push(GithubProvider({
        clientId: process.env.GITHUB_ID as string,
        clientSecret: process.env.GITHUB_SECRET as string,
    }))
}

if (providerTypes.includes('google')) {
    providers.push(GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }))
}

if (providerTypes.length === 0) {
    providers.push(CredentialsProvider({
        id: "credentials",
        type: "credentials",
        name: 'Credentials',
        credentials: {
            username: {label: "Username", type: "text", placeholder: "system"},
        },
        async authorize(credentials: Record<"username", string> | undefined) {
            return {id: "system", name: 'system', email: 'a@b'} as User
        }
    }))
}

let authOptions: NextAuthOptions = {
    providers: providers,
    callbacks: {
        async jwt({token, profile, session, user, account, trigger}) {
            if (trigger === "signIn" || trigger == "signUp") {
                if (trigger === "signIn") {
                    await createUser(profile?.email, profile?.name, user?.image || "")
                }
                if (token && profile) {
                    token.id = profile.sub
                } else if (token?.sub) {
                    token.id = token.sub
                }
            }
            return token
        },
        session: async ({session, token}) => {
            if (session?.user && !session.user.id) {
                if (token?.id) {
                    session.user.id = token.id as string
                } else {
                    console.log("session.user.id not set", token)
                }
            }
            return session
        },
    }
};
export default authOptions;