import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🔐 Admin Panel</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user?.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="bg-white rounded-lg shadow mb-6">
          <div className="flex gap-1 p-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/matches"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Matches
            </Link>
            <Link
              href="/admin/participants"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Participants
            </Link>
            <Link
              href="/admin/predictions"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Predictions
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition ml-auto"
            >
              View Public Site →
            </Link>
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}
