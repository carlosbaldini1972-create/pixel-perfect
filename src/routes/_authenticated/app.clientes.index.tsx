import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/clientes/")({
  component: ClientesList,
});

const STATUS = ["todos", "ativo", "prospect", "inativo", "suspenso"] as const;

function ClientesList() {
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["clientes", q, status],
    queryFn: async () => {
      let query = supabase
        .from("clientes")
        .select("id, razao_social, nome_fantasia, documento, segmento, status, cidade, uf, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "todos") query = query.eq("status", status);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`razao_social.ilike.${term},nome_fantasia.ilike.${term},documento.ilike.${term}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadastros</p>
          <h1 className="font-display text-3xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pessoa física e jurídica com contatos e responsáveis.</p>
        </div>
        {isStaff && (
          <Link to="/app/clientes/novo">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo cliente</Button>
          </Link>
        )}
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, razão social ou documento…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          {STATUS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Segmento</th>
              <th className="px-5 py-3 font-medium">Localização</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</td></tr>
            ) : data && data.length > 0 ? (
              data.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <Link to="/app/clientes/$id" params={{ id: c.id }} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{c.nome_fantasia || c.razao_social}</div>
                        {c.nome_fantasia && (
                          <div className="truncate text-xs text-muted-foreground">{c.razao_social}</div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.documento || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.segmento || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {[c.cidade, c.uf].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-5 py-3"><StatusPill status={c.status} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                  {isStaff && (
                    <Link to="/app/clientes/novo" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro cliente
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-success/15 text-success",
    inativo: "bg-muted text-muted-foreground",
    prospect: "bg-info/15 text-info",
    suspenso: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}
