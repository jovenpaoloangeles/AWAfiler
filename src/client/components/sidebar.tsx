import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Table2,
  Sparkles,
  BookOpen,
  Settings,
  FileText,
  FileDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Calendar", icon: CalendarDays },
  { to: "/table", label: "Table View", icon: Table2 },
  { to: "/ai", label: "AI Assist", icon: Sparkles },
  { to: "/context", label: "Context Library", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onGeneratePdf }: { onGeneratePdf?: () => void }) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-background">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <FileText className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">AWAfiler</span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* Generate PDF */}
      <div className="px-2 py-2">
        <button
          onClick={onGeneratePdf}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FileDown className="h-4 w-4" />
          Generate PDF
        </button>
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
