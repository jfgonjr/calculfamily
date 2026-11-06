-- =====================================================================
-- Calculadora Familioa - Seed de teste (rode DEPOIS de 001_schema.sql)
-- Cria: 1 família, 5 usuários (Adriana, Zé Chico, Junior, Camila, Maura),
--       categorias e transações no MÊS ATUAL para testar a calculadora.
--
-- ATENÇÃO: é só para teste. Os usuários usam e-mails fictícios e a senha
-- temporária 'familioa123'. Em produção, apague-os e crie os acessos reais
-- (Authentication > Users) com os e-mails verdadeiros.
-- =====================================================================

do $$
declare
  v_family uuid := '00000000-0000-0000-0000-00000000f001';
  v_month  date := date_trunc('month', current_date)::date;
  v_adriana uuid := '00000000-0000-0000-0000-0000000000a1';
  v_ze      uuid := '00000000-0000-0000-0000-0000000000a2';
  v_junior  uuid := '00000000-0000-0000-0000-0000000000a3';
  v_camila  uuid := '00000000-0000-0000-0000-0000000000a4';
  v_maura   uuid := '00000000-0000-0000-0000-0000000000a5';
  m record;
begin
  -- Família (orçamento mensal de R$ 6.000)
  insert into public.families (id, name, monthly_budget)
  values (v_family, 'Família Familioa', 6000)
  on conflict (id) do nothing;

  -- Usuários de teste (o trigger handle_new_user cria os profiles)
  for m in
    select * from (values
      (v_adriana, 'adriana@familioa.test', 'Adriana', '#ec4899'),
      (v_ze,      'zechico@familioa.test', 'Zé Chico', '#3b82f6'),
      (v_junior,  'junior@familioa.test',  'Junior',   '#22c55e'),
      (v_camila,  'camila@familioa.test',  'Camila',   '#f59e0b'),
      (v_maura,   'maura@familioa.test',   'Maura',    '#8b5cf6')
    ) as t(id, email, name, color)
  loop
    if not exists (select 1 from auth.users where id = m.id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', m.id, 'authenticated', 'authenticated',
        m.email, crypt('familioa123', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}',
        jsonb_build_object('family_id', v_family, 'full_name', m.name, 'color', m.color),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), m.id, m.id::text,
        jsonb_build_object('sub', m.id::text, 'email', m.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;
  end loop;

  -- Adriana é administradora da família
  update public.profiles set role = 'admin' where id = v_adriana;

  -- Categorias
  insert into public.categories (family_id, name, type, icon, color) values
    (v_family, 'Mercado',      'expense', 'shopping-cart', '#22c55e'),
    (v_family, 'Moradia',      'expense', 'home',          '#3b82f6'),
    (v_family, 'Contas',       'expense', 'zap',           '#f59e0b'),
    (v_family, 'Transporte',   'expense', 'car',           '#6366f1'),
    (v_family, 'Saúde',        'expense', 'heart-pulse',   '#ef4444'),
    (v_family, 'Lazer',        'expense', 'popcorn',       '#ec4899'),
    (v_family, 'Educação',     'expense', 'graduation-cap','#14b8a6'),
    (v_family, 'Outros',       'expense', 'tag',           '#94a3b8'),
    (v_family, 'Salário',      'income',  'wallet',        '#16a34a'),
    (v_family, 'Extra',        'income',  'piggy-bank',    '#0ea5e9')
  on conflict (family_id, name, type) do nothing;

  -- Transações do mês atual (evita duplicar se rodar de novo)
  if not exists (select 1 from public.transactions where family_id = v_family) then
    insert into public.transactions (family_id, user_id, category_id, title, amount, type, date, status, notes)
    select v_family, t.uid,
           (select id from public.categories c where c.family_id = v_family and c.name = t.cat and c.type = t.tp),
           t.title, t.amount, t.tp, v_month + t.day_offset, t.status, t.notes
    from (values
      -- Despesas pagas por cada membro
      (v_adriana, 'Aluguel',               'Moradia',    'expense', 1800.00, 0,  'paid',    'Aluguel do mês'),
      (v_adriana, 'Mercado do mês',        'Mercado',    'expense',  950.00, 2,  'paid',    null),
      (v_ze,      'Conta de luz',          'Contas',     'expense',  310.50, 3,  'paid',    null),
      (v_ze,      'Gasolina',              'Transporte', 'expense',  280.00, 5,  'paid',    null),
      (v_junior,  'Internet',              'Contas',     'expense',  129.90, 4,  'paid',    null),
      (v_junior,  'Farmácia',              'Saúde',      'expense',   86.40, 7,  'paid',    null),
      (v_camila,  'Mensalidade do curso',  'Educação',   'expense',  420.00, 6,  'paid',    null),
      (v_camila,  'Cinema e lanche',       'Lazer',      'expense',  145.00, 8,  'paid',    null),
      (v_maura,   'Feira',                 'Mercado',    'expense',  132.70, 9,  'paid',    null),
      (v_maura,   'Conta de água',         'Contas',     'expense',   97.30, 10, 'paid',    null),
      -- Pendente (NÃO entra no acerto até ser marcada como paga)
      (v_ze,      'Seguro do carro',       'Transporte', 'expense',  390.00, 12, 'pending', 'Vence no fim do mês'),
      -- Receitas
      (v_adriana, 'Salário Adriana',       'Salário',    'income',  4200.00, 4,  'paid',    null),
      (v_ze,      'Salário Zé Chico',      'Salário',    'income',  3800.00, 4,  'paid',    null),
      (v_junior,  'Freelance',             'Extra',      'income',   900.00, 10, 'paid',    null)
    ) as t(uid, title, cat, tp, amount, day_offset, status, notes);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Conferência rápida do acerto (apenas despesas PAGAS, divisão igual entre 5)
-- Total pago = 4.351,80 -> cota de cada um = 870,36
-- ---------------------------------------------------------------------
-- select p.full_name,
--        coalesce(sum(t.amount),0) as pago,
--        coalesce(sum(t.amount),0) - (select sum(amount)/5 from public.transactions
--                                      where type='expense' and status='paid') as saldo
-- from public.profiles p
-- left join public.transactions t on t.user_id = p.id and t.type='expense' and t.status='paid'
-- group by p.full_name order by saldo desc;
