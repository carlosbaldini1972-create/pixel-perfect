import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClienteForm } from "@/components/ClienteForm";

export const Route = createFileRoute("/_authenticated/app/clientes/novo")({
  component: NovoCliente,
});

function NovoCliente() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);

  return (
    <div className="px-6 py-8 lg:px-10 max-w-5xl mx-auto">
      <Link to="/app/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Novo cliente</h1>
      <p className="mt-1 text-sm text-muted-foreground">Preencha os dados cadastrais. Você poderá adicionar contatos em seguida.</p>

      <div className="mt-6">
        <ClienteForm
          submitting={saving}
          submitLabel="Cadastrar cliente"
          onSubmit={async (v) => {
            setSaving(true);
            const payload = Object.fromEntries(
              Object.entries(v).map(([k, val]) => [k, typeof val === "string" && val.trim() === "" ? null : val]),
            ) as typeof v;
            const { data, error } = await supabase.from("clientes").insert(payload as never).select("id").single();
            setSaving(false);
            if (error) {
              toast.error("Erro ao cadastrar", { description: error.message });
              return;
            }
            toast.success("Cliente cadastrado!");
            nav({ to: "/app/clientes/$id", params: { id: data.id } });
          }}
        />
      </div>
    </div>
  );
}
