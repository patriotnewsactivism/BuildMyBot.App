drop extension if exists "pg_net";

create sequence "public"."audit_log_id_seq";

drop policy "Admins can view all audit logs" on "public"."audit_logs";

drop index if exists "public"."idx_profiles_role";


  create table "public"."audit_log" (
    "id" integer not null default nextval('public.audit_log_id_seq'::regclass),
    "table_name" text not null,
    "op" text not null,
    "user_id" uuid,
    "row_id" uuid,
    "changed" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" alter column "role" set default 'OWNER'::text;

alter table "public"."profiles" alter column "role" drop not null;

alter table "public"."profiles" alter column "role" set data type text using "role"::text;

alter sequence "public"."audit_log_id_seq" owned by "public"."audit_log"."id";

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

grant delete on table "public"."audit_log" to "anon";

grant insert on table "public"."audit_log" to "anon";

grant references on table "public"."audit_log" to "anon";

grant select on table "public"."audit_log" to "anon";

grant trigger on table "public"."audit_log" to "anon";

grant truncate on table "public"."audit_log" to "anon";

grant update on table "public"."audit_log" to "anon";

grant delete on table "public"."audit_log" to "authenticated";

grant insert on table "public"."audit_log" to "authenticated";

grant references on table "public"."audit_log" to "authenticated";

grant select on table "public"."audit_log" to "authenticated";

grant trigger on table "public"."audit_log" to "authenticated";

grant truncate on table "public"."audit_log" to "authenticated";

grant update on table "public"."audit_log" to "authenticated";

grant delete on table "public"."audit_log" to "service_role";

grant insert on table "public"."audit_log" to "service_role";

grant references on table "public"."audit_log" to "service_role";

grant select on table "public"."audit_log" to "service_role";

grant trigger on table "public"."audit_log" to "service_role";

grant truncate on table "public"."audit_log" to "service_role";

grant update on table "public"."audit_log" to "service_role";

CREATE TRIGGER auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


