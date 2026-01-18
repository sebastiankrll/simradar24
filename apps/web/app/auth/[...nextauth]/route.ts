import { sign } from "jsonwebtoken";
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";

const API_URL = process.env.API_URL || "http://localhost:3001";
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";

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

const VATSIM_AUTH_URL = process.env.VATSIM_AUTH_URL || "https://auth-dev.vatsim.net";
const NAVIGRAPH_AUTH_URL = "https://identity.api.navigraph.com";

const VatsimProvider: OAuthConfig<VatsimProfile> = {
	id: "vatsim",
	name: "VATSIM",
	type: "oauth",
	authorization: {
		url: `${VATSIM_AUTH_URL}/oauth/authorize`,
		params: { scope: "full_name" },
	},
	token: `${VATSIM_AUTH_URL}/oauth/token`,
	userinfo: `${VATSIM_AUTH_URL}/api/user`,
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
	issuer: NAVIGRAPH_AUTH_URL,
	authorization: {
		url: `${NAVIGRAPH_AUTH_URL}/connect/authorize`,
		params: { scope: "openid fmsdata offline_access", response_type: "code" },
	},
	checks: ["pkce", "state"],
	token: `${NAVIGRAPH_AUTH_URL}/connect/token`,
	userinfo: `${NAVIGRAPH_AUTH_URL}/connect/userinfo`,
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
		async signIn({ profile, account }) {
			if (account?.provider === "vatsim") {
				const cid = profile?.data?.cid;
				if (!cid) return false;

				const jwtToken = sign({ vatsim: { cid } }, JWT_SECRET, {
					expiresIn: "5m",
				});

				try {
					const response = await fetch(`${API_URL}/user`, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${jwtToken}`,
						},
					});

					if (!response.ok) return false;
				} catch (err) {
					console.error("Failed to ensure user:", err);
					return false;
				}
			}

			if (account?.provider === "navigraph") {
				const response = await fetch(`${API_URL}/user/navigraph`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						accessToken: account.access_token,
						refreshToken: account.refresh_token,
						expiresAt: account.expires_at ? account.expires_at * 1000 : 3600 * 1000 + Date.now(),
					}),
				});

				if (!response.ok) {
					console.error("Failed to save Navigraph connection");
				}
			}

			return true;
		},
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
						const response = await fetch(`${NAVIGRAPH_AUTH_URL}/connect/token`, {
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
