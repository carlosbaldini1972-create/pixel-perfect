import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Shield, Activity, Users, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-bold text-foreground">
              VirtualWeb<span className="text-brand"> ERP</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button>Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle at 30% 20%, oklch(0.55 0.13 250), transparent 55%), radial-gradient(circle at 80% 60%, oklch(0.27 0.09 264), transparent 50%)" }}
          />
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Plataforma enterprise · NOC/SOC ready
              </span>
              <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-foreground lg:text-6xl">
                Centralize sua operação de tecnologia e segurança em um único ERP.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Clientes, contratos, orçamentos, ordens de serviço, tickets e portal do cliente — com
                controle de acesso por perfil, auditoria e relatórios executivos.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup">
                  <Button size="lg" className="gap-2">
                    Acessar plataforma <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">Já tenho conta</Button>
                </Link>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Users, title: "Clientes e Contatos", desc: "Cadastro PF/PJ completo com responsáveis e portal." },
                { icon: FileText, title: "Comercial", desc: "Orçamentos, contratos e ordens de serviço com PDF." },
                { icon: Activity, title: "Operacional", desc: "Tickets, agenda, SLA e indicadores em tempo real." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <Icon className="h-5 w-5 text-brand" />
                  <div className="mt-3 font-display font-semibold text-foreground">{title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VirtualWeb Tecnologia e Segurança · Todos os direitos reservados
      </footer>
    </div>
  );
}
