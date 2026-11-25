import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = new URL("../supabase/migrations/20261125083257_initial_takt.sql", import.meta.url);
const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const blocked = "10000000-0000-4000-8000-000000000004";
const firstShift = "20000000-0000-4000-8000-000000000001";
const secondShift = "20000000-0000-4000-8000-000000000002";

test("Migracja izoluje dane oraz zdjęcia i pilnuje podstawowych reguł zmiany", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Local stubs of the Supabase-managed objects used by the migration.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(
      id text primary key, name text not null, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects(bucket_id text not null, name text not null);
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select, insert on storage.objects to anon, authenticated;
  `);
  await db.exec(await readFile(migration, "utf8"));
  await db.query("insert into auth.users values ($1), ($2), ($3), ($4)", [alice, bob, admin, blocked]);
  await db.query(`
    insert into public.profiles(id, display_name, role, is_active) values
      ($1,'Pracownik A','employee',true),
      ($2,'Pracownik B','employee',true),
      ($3,'Administrator','admin',true),
      ($4,'Konto wyłączone','employee',false)
  `, [alice, bob, admin, blocked]);
  await db.query("insert into public.shifts(id, employee_id) values ($1, $2), ($3, $4)",
    [firstShift, alice, secondShift, bob]);
  await db.query(`
    insert into public.evidence(shift_id,kind,request_id,latitude,longitude,accuracy_m,photo_path) values
      ($1,'start','30000000-0000-4000-8000-000000000001',52.1,19.2,8,'a.jpg'),
      ($2,'start','30000000-0000-4000-8000-000000000002',51.8,18.8,12,'b.jpg')
  `, [firstShift, secondShift]);
  await db.exec("insert into storage.objects values ('takt-evidence','a.jpg'), ('takt-evidence','b.jpg'), ('takt-evidence','orphan.jpg'), ('another-bucket','a.jpg')");

  const { rows: [bucket] } = await db.query("select public, allowed_mime_types from storage.buckets where id='takt-evidence'");
  assert.equal(bucket.public, false);
  assert.deepEqual(bucket.allowed_mime_types, ["image/jpeg"]);
  await assert.rejects(db.query("insert into public.shifts(employee_id) values($1)", [alice]), { code: "23505" });
  await assert.rejects(db.query(`
    insert into public.evidence(shift_id,kind,request_id,latitude,longitude,accuracy_m,photo_path)
    values ($1,'stop','30000000-0000-4000-8000-000000000001',52.1,19.2,8,'duplicate.jpg')
  `, [firstShift]), { code: "23505" });

  async function asAuthenticated(user) {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  }
  async function results(query) {
    return (await db.query(query)).rows.map(row => row.value);
  }

  await asAuthenticated(alice);
  assert.deepEqual(await results("select id as value from public.profiles"), [alice]);
  assert.deepEqual(await results("select id as value from public.shifts"), [firstShift]);
  assert.deepEqual(await results("select photo_path as value from public.evidence"), ["a.jpg"]);
  assert.deepEqual(await results("select name as value from storage.objects"), ["a.jpg"]);
  await assert.rejects(db.query("update public.profiles set role='admin' where id=$1", [alice]), { code: "42501" });
  await assert.rejects(db.exec("insert into storage.objects values ('takt-evidence','new.jpg')"), { code: "42501" });

  await asAuthenticated(bob);
  assert.deepEqual(await results("select id as value from public.shifts"), [secondShift]);
  assert.deepEqual(await results("select name as value from storage.objects"), ["b.jpg"]);

  await asAuthenticated(admin);
  assert.deepEqual(await results("select id as value from public.profiles order by id"), [alice, bob, admin, blocked]);
  assert.deepEqual(await results("select photo_path as value from public.evidence order by photo_path"), ["a.jpg", "b.jpg"]);
  assert.deepEqual(await results("select name as value from storage.objects order by name"), ["a.jpg", "b.jpg"]);

  await asAuthenticated(blocked);
  assert.deepEqual(await results("select id as value from public.profiles"), []);
  assert.deepEqual(await results("select name as value from storage.objects"), []);
  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from public.shifts"), { code: "42501" });
  assert.deepEqual(await results("select name as value from storage.objects"), []);
});
