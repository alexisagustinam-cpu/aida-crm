-- Activa RLS en las tres tablas del modelo de autorización.
--
-- Las migraciones anteriores ya escribían políticas de lectura para
-- roles, permissions y role_permissions, pero nunca se les hizo
-- `enable row level security`. Una política sin RLS activado no se aplica:
-- las tres tablas quedaban abiertas a los roles anon y authenticated, que
-- en Supabase reciben permisos sobre el esquema public por defecto.
--
-- No son tablas cualquiera. has_permission() resuelve la autorización con
-- un join contra role_permissions, así que cualquiera que pudiera insertar
-- ahí una fila se concedía el permiso que quisiera.
--
-- Va como migración nueva y no como corrección de las anteriores: esas ya
-- están aplicadas en la base de datos y editarlas no las volvería a
-- ejecutar.
--
-- Con RLS activo y solo políticas de select, quedan de consulta: nadie
-- puede escribirlas desde la aplicación. Las siembras de las migraciones
-- siguen funcionando porque RLS no se aplica al dueño de la tabla, y la
-- service role key también lo omite, que es como deben mantenerse.

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
