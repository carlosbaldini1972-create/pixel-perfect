import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "colaborador" | "cliente";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: { nome: string; telefone: string | null; cliente_id: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer secondary fetches to avoid deadlocks
        setTimeout(() => { void loadUserData(s.user.id); }, 0);
      } else {
        setRoles([]);
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadUserData(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("nome, telefone, cliente_id").eq("id", userId).maybeSingle(),
    ]);
    setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    setProfile(profileRes.data ?? null);
  }

  const hasRole = (r: AppRole) => roles.includes(r);
  const isStaff = hasRole("admin") || hasRole("colaborador");

  return (
    <AuthContext.Provider
      value={{ user, session, roles, profile, loading, hasRole, isStaff, signOut: async () => { await supabase.auth.signOut(); } }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
