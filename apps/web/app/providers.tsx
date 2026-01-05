"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import { MessageBoxCloseButton } from "@/components/MessageBox/MessageBox";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<SessionProvider basePath="/auth">
				<ToastContainer closeButton={MessageBoxCloseButton} icon={false} theme="colored" />
				<ThemeProvider>{children}</ThemeProvider>
			</SessionProvider>
		</QueryClientProvider>
	);
}
