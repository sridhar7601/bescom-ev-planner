"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, Map as MapIcon, Calendar, List, Plus } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/scheduling", label: "Scheduling", icon: Calendar },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/proposals", label: "Proposals", icon: List },
  { href: "/plan/new", label: "New Plan", icon: Plus },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-lime-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-lime-500/30">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <div className="font-bold text-lg text-slate-900">ChargeSense AI</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">BESCOM EV Planner</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  active
                    ? "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-lime-500 text-white shadow-sm"
                    : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-lime-50 hover:text-lime-700 transition"
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-700">Live · ChargeSense v1</span>
        </div>
      </div>
    </header>
  );
}
