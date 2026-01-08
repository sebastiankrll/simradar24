import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]/route";
import Auth from "./components/Auth";

export default async function AuthPage() {
	const session = await getServerSession(authOptions);
	return <Auth session={session} />;
}
