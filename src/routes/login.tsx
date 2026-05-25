import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground" style={{ background: "var(--gradient-sidebar)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="font-display text-lg font-bold">VirtualWeb ERP</div>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Sua central de operações de tecnologia, infraestrutura e segurança.
          </h2>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
            Acesse contratos, ordens de serviço, tickets e indicadores em um só lugar.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/60">© VirtualWeb Tecnologia e Segurança</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-foreground">Acessar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com seu e-mail e senha corporativos.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@virtualweb.com.br" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="font-medium text-brand hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
