"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  LayoutDashboard,
  Trophy,
  Users,
  FileText,
  PenTool,
  PencilLine,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
}

const iconByHref = {
  "/admin": LayoutDashboard,
  "/admin/matches": Trophy,
  "/admin/participants": Users,
  "/admin/predictions": FileText,
  "/admin/predictions/manual": PenTool,
  "/admin/predictions/edit": PencilLine,
} as const;

export function AdminTabsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 pb-2">
      <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 -mb-2 w-full md:w-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/admin/predictions" &&
              pathname.startsWith("/admin/predictions") &&
              pathname !== "/admin/predictions/manual" &&
              pathname !== "/admin/predictions/edit");
          const Icon = iconByHref[item.href as keyof typeof iconByHref];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-[#10b981]/10 text-[#10b981]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#0a192f]",
              )}
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-[#0a192f] hover:text-[#10b981] transition-colors ml-auto md:ml-0 px-2 py-2 whitespace-nowrap"
      >
        <ExternalLink className="w-4 h-4" />
        View Public Site
      </Link>
    </div>
  );
}
