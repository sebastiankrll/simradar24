import NextAuth, { type NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";

interface VatsimProfile {
	data: {
		cid: number;
		personal: {
			name_full: string;
		};
	};
}

interface NavigraphProfile {
	sub: string;
	name: string;
}

const VATSIM_AUTH_URL = process.env.VATSIM_AUTH_URL || "auth-dev.vatsim.net";
const NAVIGRAPH_AUTH_URL = process.env.NAVIGRAPH_AUTH_URL || "identity.api.navigraph.com";

const VatsimProvider: OAuthConfig<VatsimProfile> = {
	id: "vatsim",
	name: "VATSIM",
	type: "oauth",
	authorization: {
		url: `https://${VATSIM_AUTH_URL}/oauth/authorize`,
		params: {
			scope: "full_name",
		},
	},
	token: `https://${VATSIM_AUTH_URL}/oauth/token`,
	userinfo: `https://${VATSIM_AUTH_URL}/api/user`,
	clientId: process.env.VATSIM_CLIENT_ID || "",
	clientSecret: process.env.VATSIM_CLIENT_SECRET || "",
	profile(profile) {
		return {
			id: profile.data.cid.toString(),
			cid: profile.data.cid,
			name: profile.data.personal.name_full,
		};
	},
};

const NavigraphProvider: OAuthConfig<NavigraphProfile> = {
	id: "navigraph",
	name: "Navigraph",
	type: "oauth",
	authorization: {
		url: `https://${NAVIGRAPH_AUTH_URL}/connect/authorize`,
		params: { scope: "openid" },
	},
	token: `https://${NAVIGRAPH_AUTH_URL}/connect/token`,
	userinfo: `https://${NAVIGRAPH_AUTH_URL}/connect/userinfo`,
	clientId: process.env.NAVIGRAPH_CLIENT_ID || "",
	clientSecret: process.env.NAVIGRAPH_CLIENT_SECRET || "",
	profile(profile) {
		return {
			id: profile.sub.toString(),
			userId: profile.sub,
			name: profile.name,
		};
	},
};

export const authOptions: NextAuthOptions = {
	providers: [VatsimProvider, NavigraphProvider],

	session: {
		strategy: "jwt",
	},

	callbacks: {
		async jwt({ token, account, profile }) {
			if (account?.provider === "vatsim" && profile?.data) {
				token.vatsim = {
					cid: profile.data.cid,
				};
			}

			if (account?.provider === "navigraph" && account.access_token) {
				token.navigraph = {
					accessToken: account.access_token,
					refreshToken: account.refresh_token,
				};
			}

			return token;
		},
		async session({ session, token }) {
			session.vatsim = token.vatsim;
			session.navigraph = token.navigraph;
			return session;
		},
	},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
