import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, ClipboardList, LifeBuoy, ArrowUpRight, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, user, isStaff } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [total, ativos, prospects] = await Promise.all([
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "prospect"),
      ]);
      return {
        total: total.count ?? 0,
        ativos: ativos.count ?? 0,
        prospects: prospects.count ?? 0,
      };
    },
  });

  const { data: recentes } = useQuery({
    queryKey: ["clientes-recentes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, razao_social, nome_fantasia, status, segmento, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Clientes ativos", value: stats?.ativos ?? "—", icon: Users, hint: `${stats?.total ?? 0} no total`, tone: "brand" },
    { label: "Prospects", value: stats?.prospects ?? "—", icon: TrendingUp, hint: "Pipeline comercial", tone: "info" },
    { label: "Contratos vigentes", value: "—", icon: FileText, hint: "Em breve", tone: "muted" },
    { label: "Tickets abertos", value: "—", icon: LifeBuoy, hint: "Em breve", tone: "muted" },
  ];

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dashboard executivo</p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Olá, {(profile?.nome || user?.email || "").split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da operação da VirtualWeb Tecnologia e Segurança.
          </p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, hint, tone }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                tone === "brand" && "bg-primary/10 text-primary",
                tone === "info" && "bg-brand/10 text-brand",
                tone === "muted" && "bg-muted text-muted-foreground",
              )}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-bold text-foreground">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Clientes recentes</h2>
              <p className="text-xs text-muted-foreground">Últimos cadastros na plataforma</p>
            </div>
            <Link to="/app/clientes" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentes && recentes.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentes.map((c) => (
                <li key={c.id}>
                  <Link to="/app/clientes/$id" params={{ id: c.id }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand text-sm font-semibold">
                      {c.razao_social.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {c.nome_fantasia || c.razao_social}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.segmento || "Sem segmento"} · {c.razao_social}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint label="Nenhum cliente cadastrado ainda" cta={isStaff ? { to: "/app/clientes/novo", label: "Cadastrar cliente" } : undefined} />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-display text-base font-semibold text-foreground">Pendências</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Itens críticos para hoje</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2 text-muted-foreground">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span>Módulos de contratos, OS e tickets serão habilitados nas próximas iterações.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-success/15 text-success",
    inativo: "bg-muted text-muted-foreground",
    prospect: "bg-info/15 text-info",
    suspenso: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

function EmptyHint({ label, cta }: { label: string; cta?: { to: string; label: string } }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      {cta && (
        <Link to={cta.to} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          {cta.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
