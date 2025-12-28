"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<SessionProvider basePath="/auth">
				<ThemeProvider>{children}</ThemeProvider>
			</SessionProvider>
		</QueryClientProvider>
	);
}
