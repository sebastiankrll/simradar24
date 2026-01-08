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
		params: { scope: "full_name" },
	},
	token: `https://${VATSIM_AUTH_URL}/oauth/token`,
	userinfo: `https://${VATSIM_AUTH_URL}/api/user`,
	clientId: process.env.VATSIM_CLIENT_ID || "",
	clientSecret: process.env.VATSIM_CLIENT_SECRET || "",
	profile(profile) {
		return {
			id: profile.data.cid.toString(),
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
		params: { scope: "openid fmsdata offline_access", response_type: "code" },
	},
	checks: ["pkce", "state"],
	token: `https://${NAVIGRAPH_AUTH_URL}/connect/token`,
	userinfo: `https://${NAVIGRAPH_AUTH_URL}/connect/userinfo`,
	clientId: process.env.NAVIGRAPH_CLIENT_ID || "",
	clientSecret: process.env.NAVIGRAPH_CLIENT_SECRET || "",
	profile(profile) {
		return {
			id: profile.sub.toString(),
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
				return {
					...token,
					vatsim: {
						cid: profile.data.cid,
						name: profile.data.personal.name_full,
					},
				};
			}

			if (account?.provider === "navigraph") {
				return {
					...token,
					navigraph: {
						accessToken: account.access_token,
						refreshToken: account.refresh_token,
						expiresAt: account.expires_at ? account.expires_at * 1000 : undefined,
					},
				};
			}

			if (token.navigraph) {
				if (!token.navigraph.expiresAt) {
					return token;
				} else if (Date.now() < token.navigraph.expiresAt) {
					return token;
				} else {
					if (!token.navigraph?.refreshToken) throw new TypeError("Missing refresh_token");

					try {
						const response = await fetch(`https://${NAVIGRAPH_AUTH_URL}/connect/token`, {
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded",
							},
							body: new URLSearchParams({
								client_id: process.env.NAVIGRAPH_CLIENT_ID || "",
								client_secret: process.env.NAVIGRAPH_CLIENT_SECRET || "",
								grant_type: "refresh_token",
								refresh_token: token.navigraph.refreshToken,
							}),
						});

						const tokensOrError = await response.json();
						if (!response.ok) throw tokensOrError;

						const newTokens = tokensOrError as {
							access_token: string;
							expires_in: number;
							refresh_token?: string;
						};

						return {
							...token,
							navigraph: {
								accessToken: newTokens.access_token,
								refreshToken: newTokens.refresh_token || token.navigraph?.refreshToken,
								expiresAt: Date.now() + newTokens.expires_in * 1000,
							},
						};
					} catch (error) {
						console.error("Error refreshing access_token", error);
						return token;
					}
				}
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
