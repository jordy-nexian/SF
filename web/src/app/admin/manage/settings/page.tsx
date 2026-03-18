import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { isAdministrator } from "@/lib/auth-helpers";
import TenantSettingsPage from "@/app/admin/settings/page";

export const dynamic = "force-dynamic";

/**
 * E2.3: Settings route guard — only Administrators (owner/admin) can access.
 * Non-admins are redirected to /admin/manage with no error flash.
 */
export default async function SettingsGuardPage() {
	const session = await getServerSession(authOptions);
	if (!session) {
		redirect("/signin?callbackUrl=/admin/manage/settings");
	}

	const role = (session.user?.role ?? "viewer") as "owner" | "admin" | "viewer";

	if (!isAdministrator(role)) {
		redirect("/admin/manage");
	}

	// Render the existing settings component for authorized admins
	return <TenantSettingsPage />;
}
