-- =====================================================================
-- 03 - Campo CPF no cadastro de clientes
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.
-- =====================================================================

alter table public.clientes add column if not exists cpf text;

-- Não deixa cadastrar o mesmo CPF em dois clientes (clientes sem CPF continuam permitidos).
create unique index if not exists clientes_cpf_unico on public.clientes (cpf) where cpf is not null and cpf <> '';

-- Avisa o sistema que a tabela mudou.
notify pgrst, 'reload schema';
