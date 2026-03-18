import AssignmentsPage from "@/app/admin/assignments/page";

export const dynamic = "force-dynamic";

/**
 * E2.4: Assignments under Admin section.
 * Currently unrestricted — all roles can access.
 * To restrict to administrators only, add the same guard pattern used in
 * /admin/manage/settings/page.tsx (check isAdministrator + redirect).
 */
export default function AdminAssignmentsPage() {
	return <AssignmentsPage />;
}
