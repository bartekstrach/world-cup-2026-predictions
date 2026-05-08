import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminTabsNav } from "@/components/admin/admin-tabs-nav";
import { Shield, LogOut } from "lucide-react";

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

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/matches", label: "Matches" },
    { href: "/admin/participants", label: "Participants" },
    { href: "/admin/predictions", label: "Predictions" },
    { href: "/admin/predictions/manual", label: "Manual Entry" },
    { href: "/admin/predictions/edit", label: "Edit Predictions" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-white to-[#e6f2ef] text-slate-800 pb-12">
      <header className="bg-white/50 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#0a192f] rounded-lg shadow-sm">
                <Shield className="h-5 w-5 text-[#10b981]" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] tracking-tight">
                Admin Panel
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="hidden md:inline-flex text-xs font-mono font-medium text-slate-600 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-full"
              >
                {session.user?.email}
              </Badge>
              <form action={handleSignOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        <AdminTabsNav items={navItems} />

        {children}
      </div>
    </div>
  );
}
