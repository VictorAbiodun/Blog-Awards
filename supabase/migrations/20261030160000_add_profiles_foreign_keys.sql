-- Link user_id in payments, flags, and audit_logs to profiles(id)
-- This enables PostgREST resource embedding (e.g. select=*,profiles:user_id(display_name))

alter table public.payments
  add constraint payments_user_id_profiles_fk
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

alter table public.flags
  add constraint flags_user_id_profiles_fk
  foreign key (user_id) references public.profiles(id)
  on delete set null;

alter table public.audit_logs
  add constraint audit_logs_user_id_profiles_fk
  foreign key (user_id) references public.profiles(id)
  on delete restrict;
