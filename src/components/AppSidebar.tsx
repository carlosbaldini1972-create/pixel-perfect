import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Package, Wrench, FileText, FileSignature,
  ClipboardList, LifeBuoy, Calendar, DollarSign, Settings, Shield, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; icon: typeof Users; staffOnly?: boolean; soon?: boolean };

const items: Item[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/produtos", label: "Produtos", icon: Package, soon: true },
  { to: "/app/servicos", label: "Serviços", icon: Wrench, soon: true },
  { to: "/app/orcamentos", label: "Orçamentos", icon: FileText, soon: true },
  { to: "/app/contratos", label: "Contratos", icon: FileSignature, soon: true },
  { to: "/app/ordens", label: "Ordens de Serviço", icon: ClipboardList, soon: true },
  { to: "/app/tickets", label: "Tickets", icon: LifeBuoy, soon: true },
  { to: "/app/agenda", label: "Agenda", icon: Calendar, soon: true },
  { to: "/app/financeiro", label: "Financeiro", icon: DollarSign, soon: true, staffOnly: true },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, soon: true, staffOnly: true },
];

export function AppSidebar() {
  const { profile, user, roles, signOut, isStaff } = useAuth();
  const { location } = useRouterState();

  return (
    <aside
      className="hidden md:flex w-64 shrink-0 flex-col text-sidebar-foreground"
      style={{ background: "var(--gradient-sidebar)" }}
    >
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-sm font-bold leading-tight">VirtualWeb</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">ERP Enterprise</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Operação
        </div>
        <ul className="space-y-0.5">
          {items.filter((i) => !i.staffOnly || isStaff).map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== "/app" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            const content = (
              <span className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                item.soon && "opacity-60",
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <span className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">em breve</span>
                )}
              </span>
            );
            return (
              <li key={item.to}>
                {item.soon ? (
                  <span className="block cursor-not-allowed">{content}</span>
                ) : (
                  <Link to={item.to}>{content}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground text-sm font-semibold">
            {(profile?.nome || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.nome || user?.email}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">
              {roles.length ? roles.join(", ") : "sem papel"}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );
}
