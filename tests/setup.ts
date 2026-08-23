/// <reference types="@cloudflare/vitest-pool-workers/types" />
/// <reference types="@cloudflare/workers-types" />
// 테스트 격리 DB 준비: 워커 시작 시 마이그레이션을 1회 적용한다.
import { env } from "cloudflare:test";
import migration1 from "../migrations/0001_initial.sql?raw";
import migration2 from "../migrations/0002_burn_reads.sql?raw";

const db = (env as unknown as { DB: D1Database }).DB;
// D1 exec은 줄 단위 파서라 멀티라인 문장을 못 다룬다 → 주석 제거 후 ";"로 직접 분리해 batch.
const toStatements = (migrationSql: string) =>
  migrationSql
    .split(";")
    .map((stmt) =>
      stmt
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((stmt) => stmt.length > 0);
await db.batch(
  [...toStatements(migration1), ...toStatements(migration2)].map((sql) => db.prepare(sql)),
);
