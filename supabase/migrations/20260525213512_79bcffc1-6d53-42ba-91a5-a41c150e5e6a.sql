
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador', 'cliente');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  avatar_url TEXT,
  cliente_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_user_cliente_id helper
CREATE OR REPLACE FUNCTION public.get_user_cliente_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.profiles WHERE id = _user_id
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  -- Default new signups to colaborador. Admins must be promoted manually.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo IN ('PF', 'PJ')),
  documento TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  segmento TEXT,
  email TEXT,
  telefone TEXT,
  site TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'prospect', 'suspenso')),
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clientes_status ON public.clientes(status);
CREATE INDEX idx_clientes_razao ON public.clientes(razao_social);

CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK profiles.cliente_id -> clientes
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Contatos
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  tipo TEXT DEFAULT 'comercial',
  acesso_portal BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contatos_cliente ON public.contatos(cliente_id);
CREATE TRIGGER trg_contatos_updated BEFORE UPDATE ON public.contatos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clientes
CREATE POLICY "Staff read all clientes" ON public.clientes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador')
    OR id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Staff insert clientes" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'));
CREATE POLICY "Staff update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'));
CREATE POLICY "Admins delete clientes" ON public.clientes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- contatos
CREATE POLICY "Staff read contatos" ON public.contatos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador')
    OR cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Staff insert contatos" ON public.contatos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'));
CREATE POLICY "Staff update contatos" ON public.contatos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'colaborador'));
CREATE POLICY "Admins delete contatos" ON public.contatos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
