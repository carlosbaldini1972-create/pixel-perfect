import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type ClienteFormValues = {
  tipo: "PF" | "PJ";
  documento: string;
  razao_social: string;
  nome_fantasia: string;
  segmento: string;
  email: string;
  telefone: string;
  site: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: "ativo" | "inativo" | "prospect" | "suspenso";
  observacoes: string;
};

const empty: ClienteFormValues = {
  tipo: "PJ", documento: "", razao_social: "", nome_fantasia: "", segmento: "",
  email: "", telefone: "", site: "", cep: "", logradouro: "", numero: "",
  complemento: "", bairro: "", cidade: "", uf: "", status: "ativo", observacoes: "",
};

export function ClienteForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: {
  initial?: Partial<ClienteFormValues>;
  onSubmit: (v: ClienteFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [v, setV] = useState<ClienteFormValues>({ ...empty, ...initial });
  const set = <K extends keyof ClienteFormValues>(k: K, val: ClienteFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  function handle(e: FormEvent) {
    e.preventDefault();
    void onSubmit(v);
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-sm font-semibold text-foreground">Identificação</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2 space-y-2">
            <Label>Tipo</Label>
            <Select value={v.tipo} onValueChange={(x) => set("tipo", x as "PF" | "PJ")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                <SelectItem value="PF">Pessoa Física</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>{v.tipo === "PJ" ? "CNPJ" : "CPF"}</Label>
            <Input value={v.documento} onChange={(e) => set("documento", e.target.value)} placeholder="Apenas números" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Status</Label>
            <Select value={v.status} onValueChange={(x) => set("status", x as ClienteFormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Razão social / Nome*</Label>
            <Input required value={v.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Nome fantasia</Label>
            <Input value={v.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Segmento</Label>
            <Input value={v.segmento} onChange={(e) => set("segmento", e.target.value)} placeholder="Ex: Indústria, Saúde, Educação…" />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Site</Label>
            <Input value={v.site} onChange={(e) => set("site", e.target.value)} placeholder="https://" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-sm font-semibold text-foreground">Contato</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3 space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Telefone</Label>
            <Input value={v.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-sm font-semibold text-foreground">Endereço</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2 space-y-2">
            <Label>CEP</Label>
            <Input value={v.cep} onChange={(e) => set("cep", e.target.value)} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Logradouro</Label>
            <Input value={v.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
          </div>
          <div className="sm:col-span-1 space-y-2">
            <Label>Número</Label>
            <Input value={v.numero} onChange={(e) => set("numero", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Complemento</Label>
            <Input value={v.complemento} onChange={(e) => set("complemento", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Bairro</Label>
            <Input value={v.bairro} onChange={(e) => set("bairro", e.target.value)} />
          </div>
          <div className="sm:col-span-1 space-y-2">
            <Label>UF</Label>
            <Input maxLength={2} value={v.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <Label>Cidade</Label>
            <Input value={v.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-sm font-semibold text-foreground">Observações</h3>
        <Textarea
          className="mt-3"
          rows={4}
          value={v.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Notas internas sobre o cliente…"
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : submitLabel}</Button>
      </div>
    </form>
  );
}
