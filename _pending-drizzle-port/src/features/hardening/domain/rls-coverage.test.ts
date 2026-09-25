import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* Una política de RLS sobre una tabla que no tiene RLS activado no se
   aplica: no falla, no avisa, simplemente no hace nada. Así quedaron
   abiertas roles, permissions y role_permissions — y sobre esa última se
   apoya has_permission(), o sea toda la autorización.

   Este test lee las migraciones como texto y compara: toda tabla creada
   tiene que aparecer también en un `enable row level security`. Es la
   comprobación que habría cazado el descuido el día que se introdujo. */

const DIR = join(process.cwd(), "supabase", "migrations");

function migrationsSql(): string {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(DIR, f), "utf8"))
    .join("\n");
}

describe("cobertura de row level security", () => {
  const sql = migrationsSql();
  const created = [
    ...new Set(
      [...sql.matchAll(/create table(?: if not exists)?\s+public\.(\w+)/g)].map(
        (m) => m[1],
      ),
    ),
  ];
  const protectedTables = new Set(
    [
      ...sql.matchAll(
        /alter table\s+public\.(\w+)\s+enable row level security/g,
      ),
    ].map((m) => m[1]),
  );

  it("encuentra las migraciones y las tablas", () => {
    expect(created.length).toBeGreaterThan(30);
  });

  it("toda tabla de public tiene RLS activado", () => {
    const sinRls = created.filter((t) => !protectedTables.has(t));
    expect(
      sinRls,
      `sin 'enable row level security': ${sinRls.join(", ")}. Una política escrita sobre una tabla sin RLS no se aplica.`,
    ).toEqual([]);
  });

  it("toda tabla con RLS tiene al menos una política, o nadie podrá leerla", () => {
    const conPolitica = new Set(
      [...sql.matchAll(/create policy\s+\S+\s+on\s+public\.(\w+)/g)].map(
        (m) => m[1],
      ),
    );
    const mudas = [...protectedTables].filter((t) => !conPolitica.has(t));
    expect(
      mudas,
      `con RLS pero sin ninguna política: ${mudas.join(", ")}`,
    ).toEqual([]);
  });
});
