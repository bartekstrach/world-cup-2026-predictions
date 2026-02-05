import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Trophy,
  Users,
  FileText,
  Edit,
  ExternalLink,
  Shield,
  LogOut,
} from "lucide-react";

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
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/matches", label: "Matches", icon: Trophy },
    { href: "/admin/participants", label: "Participants", icon: Users },
    { href: "/admin/predictions", label: "Predictions", icon: FileText },
    { href: "/admin/predictions/manual", label: "Manual Entry", icon: Edit },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="hidden sm:flex">
                {session.user?.email}
              </Badge>
              <form action={handleSignOut}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <nav className="flex flex-wrap gap-1 p-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-2 ml-auto text-primary"
            >
              <Link href="/">
                <ExternalLink className="h-4 w-4" />
                View Public Site
              </Link>
            </Button>
          </nav>
        </Card>

        {children}
      </div>
    </div>
  );
}
