-- ============================================================================
-- Canal de provisionamento de papel.
--
-- 0013 fechou a escalação lendo o papel de `raw_app_meta_data` (só a
-- service-role escreve) em vez de `raw_user_meta_data` (o usuário escreve).
-- A parte de SEGURANÇA funcionou. A de PROVISIONAMENTO não:
--
-- o GoTrue insere a linha em auth.users com app_metadata apenas
-- {"provider":"email"} e só DEPOIS aplica, num UPDATE, o app_metadata que o
-- admin.createUser() mandou. Como o trigger era só `after insert`, ele nunca
-- via o papel e caía no default 'student'. Resultado observado: a conta de
-- gestor da demo logava e caía no app do ALUNO.
--
-- Correção: sincronizar o papel também quando raw_app_meta_data muda. Isso
-- mantém a propriedade de segurança (a origem continua sendo um campo que só
-- a service-role escreve) e conserta o provisionamento.
-- ============================================================================
create function sync_role_from_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  -- nada a fazer se o app_metadata não mudou o papel
  if new.raw_app_meta_data ->> 'role' is null then
    return new;
  end if;
  if coalesce(old.raw_app_meta_data ->> 'role', '') = (new.raw_app_meta_data ->> 'role') then
    return new;
  end if;

  v_role := (new.raw_app_meta_data ->> 'role')::user_role;

  update profiles set role = v_role where id = new.id;

  -- um perfil que vira aluno precisa da linha em students; o caminho inverso
  -- não apaga nada (evidência de aluno nunca é destruída por troca de papel).
  if v_role = 'student' then
    insert into students (id, linking_code)
    values (new.id, upper(substr(md5(random()::text || new.id::text), 1, 6)))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_app_metadata_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function sync_role_from_app_metadata();

-- Repara as contas já criadas pelo caminho quebrado (a de gestor da demo).
update profiles p
set role = (u.raw_app_meta_data ->> 'role')::user_role
from auth.users u
where u.id = p.id
  and u.raw_app_meta_data ->> 'role' is not null
  and (u.raw_app_meta_data ->> 'role')::user_role <> p.role;
