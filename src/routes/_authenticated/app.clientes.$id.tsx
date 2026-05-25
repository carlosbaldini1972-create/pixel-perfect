import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, Mail, Phone, MapPin, Building2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClienteForm } from "@/components/ClienteForm";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/clientes/$id")({
  component: ClienteDetail,
});

function ClienteDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isStaff, hasRole } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: contatos } = useQuery({
    queryKey: ["contatos", id],
    queryFn: async () => {
      const { data } = await supabase.from("contatos").select("*").eq("cliente_id", id).order("created_at");
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="px-6 py-8 lg:px-10 text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!cliente) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
        <Link to="/app/clientes" className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
      </div>
    );
  }

  async function deleteCliente() {
    if (!confirm("Excluir este cliente? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Cliente excluído");
    nav({ to: "/app/clientes" });
  }

  return (
    <div className="px-6 py-8 lg:px-10 max-w-6xl mx-auto">
      <Link to="/app/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {cliente.nome_fantasia || cliente.razao_social}
            </h1>
            {cliente.nome_fantasia && (
              <p className="text-sm text-muted-foreground">{cliente.razao_social}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={cliente.status} />
              <span className="text-xs text-muted-foreground">{cliente.tipo} · {cliente.documento || "Sem documento"}</span>
            </div>
          </div>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setEditing((s) => !s)}>
              {editing ? <><X className="h-4 w-4" /> Cancelar</> : <><Pencil className="h-4 w-4" /> Editar</>}
            </Button>
            {hasRole("admin") && (
              <Button variant="destructive" className="gap-2" onClick={deleteCliente}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
        )}
      </header>

      {editing ? (
        <div className="mt-6">
          <ClienteForm
            initial={cliente as never}
            submitting={saving}
            submitLabel="Salvar alterações"
            onSubmit={async (v) => {
              setSaving(true);
              const payload = Object.fromEntries(
                Object.entries(v).map(([k, val]) => [k, typeof val === "string" && val.trim() === "" ? null : val]),
              );
              const { error } = await supabase.from("clientes").update(payload as never).eq("id", id);
              setSaving(false);
              if (error) return toast.error("Erro ao salvar", { description: error.message });
              toast.success("Cliente atualizado");
              setEditing(false);
              qc.invalidateQueries({ queryKey: ["cliente", id] });
              qc.invalidateQueries({ queryKey: ["clientes"] });
            }}
          />
        </div>
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InfoCard title="Contato" icon={Mail} items={[
            ["E-mail", cliente.email],
            ["Telefone", cliente.telefone],
            ["Site", cliente.site],
          ]} />
          <InfoCard title="Endereço" icon={MapPin} items={[
            ["Logradouro", [cliente.logradouro, cliente.numero, cliente.complemento].filter(Boolean).join(", ")],
            ["Bairro", cliente.bairro],
            ["Cidade / UF", [cliente.cidade, cliente.uf].filter(Boolean).join(" / ")],
            ["CEP", cliente.cep],
          ]} />
          <InfoCard title="Comercial" icon={Phone} items={[
            ["Segmento", cliente.segmento],
            ["Status", cliente.status],
            ["Cadastro", new Date(cliente.created_at).toLocaleDateString("pt-BR")],
          ]} />

          {cliente.observacoes && (
            <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-sm font-semibold text-foreground">Observações</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{cliente.observacoes}</p>
            </div>
          )}
        </section>
      )}

      {!editing && <ContatosSection clienteId={id} contatos={contatos ?? []} canEdit={isStaff} />}
    </div>
  );
}

function InfoCard({
  title, icon: Icon, items,
}: { title: string; icon: typeof Mail; items: [string, string | null | undefined][] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {items.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right text-foreground">{val || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ContatosSection({
  clienteId, contatos, canEdit,
}: { clienteId: string; contatos: Array<Record<string, unknown>>; canEdit: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", cargo: "", email: "", telefone: "", whatsapp: "", tipo: "comercial", acesso_portal: false,
  });

  async function add(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("contatos").insert({ cliente_id: clienteId, ...form } as never);
    if (error) return toast.error("Erro ao adicionar contato", { description: error.message });
    toast.success("Contato adicionado");
    setForm({ nome: "", cargo: "", email: "", telefone: "", whatsapp: "", tipo: "comercial", acesso_portal: false });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["contatos", clienteId] });
  }

  async function remove(id: string) {
    if (!confirm("Remover contato?")) return;
    const { error } = await supabase.from("contatos").delete().eq("id", id);
    if (error) return toast.error("Erro", { description: error.message });
    qc.invalidateQueries({ queryKey: ["contatos", clienteId] });
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">Contatos</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar contato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Nome*</Label>
                    <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="comercial / técnico…" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <Checkbox
                      id="portal"
                      checked={form.acesso_portal}
                      onCheckedChange={(c) => setForm({ ...form, acesso_portal: !!c })}
                    />
                    <Label htmlFor="portal" className="cursor-pointer">Liberar acesso ao portal do cliente</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Adicionar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {contatos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contatos.map((c) => (
              <li key={c.id as string} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand text-sm font-semibold">
                  {(c.nome as string).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{c.nome as string}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.cargo, c.tipo].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="hidden sm:block text-sm text-muted-foreground">{(c.email as string) || ""}</div>
                <div className="hidden sm:block text-sm text-muted-foreground">{(c.telefone as string) || ""}</div>
                {(c.acesso_portal as boolean) && (
                  <span className="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-info">portal</span>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id as string)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
