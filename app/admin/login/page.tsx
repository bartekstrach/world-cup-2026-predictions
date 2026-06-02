import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function LoginPage() {
  const t = await getT();

  async function handleLogin(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/admin",
      });
    } catch (error) {
      // https://github.com/nextauthjs/next-auth/discussions/9389
      if (isRedirectError(error)) throw error; // <-- allow Next.js to redirect

      console.error("Error while logging into Admin panel", error);
      redirect("/admin/login?error=invalid");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">{t("admin.login.title")}</CardTitle>
          </div>
          <CardDescription>{t("admin.login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("admin.login.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("admin.login.emailPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("admin.login.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              {t("admin.login.signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
