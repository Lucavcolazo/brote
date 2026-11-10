// Prueba la migración en un Postgres embebido (PGlite) con stubs de Supabase.
// Uso: npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const readMigration = (f) =>
  readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8").replace(/^create extension.*$/gim, "");
const migration = readMigration("20261106000000_brote.sql");
const reactions = readMigration("20261107000000_reactions.sql");
const reglas = readMigration("20261108000000_reglas.sql");
const tienda = readMigration("20261109000000_tienda_por_persona.sql");
const extras = readMigration("20261110000000_margen_album_avisos.sql");
const notas = readMigration("20261111000000_notas.sql");

const stubs = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema vault; create schema net; create schema extensions;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create view vault.decrypted_secrets as select 'x'::text as name, 'y'::text as decrypted_secret where false;
create table net.calls (url text, body jsonb);
create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) returns bigint
  language sql as $$ insert into net.calls values (url, body); select 1::bigint $$;
create publication supabase_realtime;
grant usage on schema storage to authenticated, service_role;
grant select, insert, delete on storage.objects to authenticated;
alter table storage.objects enable row level security;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const db = new PGlite();
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
  if (!cond) failures++;
};
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}
async function expectError(promise, re, msg) {
  try {
    await promise;
    ok(false, `${msg} (no tiró error)`);
  } catch (e) {
    ok(re.test(e.message), `${msg} → "${e.message}"`);
  }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;

await db.exec(stubs);
await db.exec(migration);
await db.exec(reactions);
await db.exec(reglas);
await db.exec(tienda);
await db.exec(extras);
await db.exec(notas);
ok(true, "migraciones aplicadas");

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
await db.exec(`insert into auth.users values ('${A}'), ('${B}'), ('${C}')`);

// --- perfiles (app cerrada: 2 personas) ---
const pa = await as(A, () => one(`select * from public.claim_profile('Luca', '🦊', 'es')`));
ok(pa.couple_id && pa.lang === "es", "Luca entra y se crea la pareja");
const pa2 = await as(A, () => one(`select * from public.claim_profile('Otro', '🐻', 'pt')`));
ok(pa2.name === "Luca", "volver a entrar no pisa el perfil");
const pb = await as(B, () => one(`select * from public.claim_profile('Giovanna', '🌻', 'pt')`));
ok(pb.couple_id === pa.couple_id && pb.lang === "pt", "Giovanna entra a la misma pareja, en portugués");
const couple = { id: pa.couple_id };
await as(C, () => expectError(db.query(`select public.claim_profile('Intruso')`), /app_full/, "un tercero no puede entrar"));
ok((await as(A, () => all(`select * from public.store_items`))).length === 0, "la tienda arranca vacía");
await as(A, () => db.query(`insert into public.store_items (title, cost) values ('Elijo la peli', 2), ('Zafo de los platos', 2), ('Masajes', 3), ('Desayuno', 5), ('Plan del finde', 6), ('Cena afuera', 10)`));
const items = await as(A, () => all(`select * from public.store_items order by cost, title`));
ok(items.length === 6 && items.every((i) => i.created_by === A), "Luca carga 6 premios a su nombre");
await as(A, () => db.query(`update public.store_items set cost = 4 where title = 'Desayuno'`));
ok((await one(`select cost from public.store_items where title = 'Desayuno'`)).cost === 4, "Luca edita su premio");
await as(B, () => db.query(`update public.store_items set cost = 1, active = false where title = 'Desayuno'`));
const desayuno = await one(`select cost, active from public.store_items where title = 'Desayuno'`);
ok(desayuno.cost === 4 && desayuno.active, "Giovanna ve los premios de Luca pero no los puede editar ni sacar");
await as(B, () => expectError(db.query(`insert into public.store_items (title, cost, created_by) values ('Trampa', 1, $1)`, [A]), /row-level security/, "no se puede cargar un premio a nombre del otro"));
await as(A, () => db.query(`update public.store_items set cost = 5 where title = 'Desayuno'`));
await as(A, () => db.query(`update public.profiles set avatar = $1 where id = $2`, [JSON.stringify({ shape: "bean", color: "tomato", eyes: "happy", mouth: "grin" }), A]));
ok((await one(`select avatar->>'shape' as s from public.profiles where id = $1`, [A])).s === "bean", "Luca guarda su avatar");
await as(A, () => db.query(`update public.profiles set avatar = '{"shape":"hack"}' where id = $1`, [B]));
ok((await one(`select avatar->>'shape' as s from public.profiles where id = $1`, [B])).s === null, "Luca no puede tocar el avatar de Giovanna");
const cProfiles = await as(C, () => all(`select * from public.profiles`));
ok(cProfiles.length === 0, "el tercero no ve perfiles");
await as(B, () => db.query(`update public.profiles set lang = 'es' where id = $1`, [B]));
ok((await one(`select lang from public.profiles where id = $1`, [B])).lang === "es", "se puede cambiar el idioma");
await as(B, () => db.query(`update public.profiles set lang = 'pt' where id = $1`, [B]));

// Hacemos que se hayan unido hace 10 días para poder cerrar días pasados.
await db.exec(`update public.profiles set joined_at = now() - interval '10 days'`);

// --- comidas ---
const today = (await one(`select private.local_today() as d`)).d.toISOString().slice(0, 10);
const path = `${couple.id}/${A}/foto1.jpg`;
await as(A, () => db.query(`insert into public.meals (kind, description, photo_path) values ('fruta', 'Manzana', $1)`, [path]));
ok(true, "A carga una fruta hoy");
await as(A, () => expectError(db.query(`insert into public.meals (kind, photo_path) values ('fruta', null)`), /row-level security|violates/, "sin foto no se puede"));
await as(A, () => expectError(db.query(`insert into public.meals (kind, photo_path, local_date) values ('fruta', $1, current_date - 5)`, [path]), /row-level security/, "no se puede cargar hace 5 días"));
await as(A, () => expectError(db.query(`insert into public.meals (kind, photo_path, local_date) values ('fruta', $1, private.local_today() - 1)`, [path]), /row-level security/, "lo de ayer ya no se puede cargar (el día termina a las 00)"));
await as(A, () => expectError(db.query(`insert into public.meals (kind, photo_path) values ('fruta', $1)`, [`${couple.id}/${B}/x.jpg`]), /row-level security/, "no se puede subir en la carpeta del otro"));
await as(A, () => expectError(db.query(`insert into public.meals (kind, photo_path, review) values ('fruta', $1, 'ok')`, [path]), /permission denied/, "no se puede autoaprobar"));
const calls = await all(`select * from net.calls`);
ok(calls.length === 0, "sin secretos en vault, el trigger no rompe el insert");

const mealA = await one(`select id from public.meals limit 1`);
await as(A, () => expectError(db.query(`select public.review_meal($1, 'ok')`, [mealA.id]), /cannot_review/, "A no puede revisar su propia comida"));
await as(B, () => db.query(`select public.review_meal($1, 'ok')`, [mealA.id]));
ok((await one(`select review from public.meals where id = $1`, [mealA.id])).review === "ok", "B aprueba la comida de A");

// --- reacciones ---
await as(B, () => db.query(`select public.react_meal($1, '❤️')`, [mealA.id]));
ok((await as(A, () => all(`select * from public.meal_reactions`))).length === 1, "B reacciona a la foto de A y A la ve");
ok((await all(`select * from net.calls`)).length === 0, "reaccionar no rompe aunque falten los secretos");
await as(B, () => db.query(`select public.react_meal($1, '😂')`, [mealA.id]));
const rx = await all(`select * from public.meal_reactions where meal_id = $1`, [mealA.id]);
ok(rx.length === 1 && rx[0].emoji === "😂", "cambiar de reacción la reemplaza");
await as(A, () => db.query(`select public.react_meal($1, '💪')`, [mealA.id]));
ok((await all(`select * from public.meal_reactions where meal_id = $1`, [mealA.id])).length === 2, "A también puede reaccionar a su foto");
await as(B, () => db.query(`select public.react_meal($1, '😂')`, [mealA.id]));
ok((await all(`select * from public.meal_reactions where user_id = $1`, [B])).length === 0, "tocar la misma reacción la saca");
await as(C, () => expectError(db.query(`select public.react_meal($1, '❤️')`, [mealA.id]), /not_in_couple|meal_not_found/, "un tercero no puede reaccionar"));
ok((await as(C, () => all(`select * from public.meal_reactions`))).length === 0, "un tercero no ve reacciones");
await as(A, () => expectError(db.query(`insert into public.meal_reactions (meal_id, user_id, couple_id, emoji) values ($1, $2, $3, 'x')`, [mealA.id, B, couple.id]), /permission denied/, "no se puede reaccionar en nombre del otro"));
await as(B, () => db.query(`select public.react_meal($1, '❤️')`, [mealA.id]));

// --- cierre del día ---
// Ayer: A comió verdura, B nada. Anteayer: ninguno. Hoy-3: B comió algo que A rechazó.
await db.exec(`
  insert into public.meals (user_id, couple_id, kind, photo_path, local_date) values
    ('${A}', '${couple.id}', 'verdura', '${couple.id}/${A}/ayer.jpg', date '${today}' - 1),
    ('${B}', '${couple.id}', 'fruta',   '${couple.id}/${B}/rech.jpg', date '${today}' - 3);
  update public.meals set review = 'rejected' where local_date = date '${today}' - 3;
`);
await as(A, () => expectError(db.query(`select public.review_meal(id, 'ok') from public.meals where local_date = date '${today}' - 3`), /review_closed/, "después de las 8:00 del día siguiente ya no se puede revisar"));
const d1 = await all(`select * from public.srv_close_day(date '${today}' - 1)`);
const auto = await one(`select review, review_auto from public.meals where local_date = date '${today}' - 1`);
ok(auto.review === "ok" && auto.review_auto === true, "la comida de ayer que nadie revisó se aprobó sola al cerrar");
ok(d1.length === 1 && d1[0].failed_name === "Giovanna" && d1[0].beneficiary_name === "Luca", "ayer: Giovanna no comió → +1 para Luca");
const d1again = await all(`select * from public.srv_close_day(date '${today}' - 1)`);
ok(d1again.length === 0, "cerrar el mismo día dos veces no duplica puntos");
const d2 = await all(`select * from public.srv_close_day(date '${today}' - 2)`);
ok(d2.length === 2, "anteayer: ninguno comió → un punto para cada uno");
const d3 = await all(`select * from public.srv_close_day(date '${today}' - 3)`);
ok(d3.length === 2, "comida rechazada no cuenta");
const d20 = await all(`select * from public.srv_close_day(date '${today}' - 20)`);
ok(d20.length === 0, "días antes de unirse no cuentan");

const bal = await all(`select user_id, sum(amount)::int as s from public.point_events group by 1 order by 1`);
ok(bal.find((r) => r.user_id === A).s === 3 && bal.find((r) => r.user_id === B).s === 2, "saldos: Luca 3, Giovanna 2");

// --- tienda ---
const masaje = items.find((i) => i.cost === 3);
const peli = items.find((i) => i.title === 'Elijo la peli');
const cena = items.find((i) => i.cost === 10);
await as(A, () => expectError(db.query(`select public.redeem_item($1)`, [masaje.id]), /own_item/, "Luca no puede canjear sus propios premios"));
await as(B, () => expectError(db.query(`select public.redeem_item($1)`, [masaje.id]), /not_enough_points/, "Giovanna (2 pts) no puede canjear algo de 3"));
await as(B, () => expectError(db.query(`select public.redeem_item($1)`, [cena.id]), /not_enough_points/, "Giovanna no puede canjear la cena (10)"));
const redPeli = await as(B, () => one(`select * from public.redeem_item($1)`, [peli.id]));
ok(redPeli.status === "pendiente", "Giovanna canjea la peli (2) de la lista de Luca");
ok((await one(`select sum(amount)::int as s from public.point_events where user_id = $1`, [B])).s === 0, "a Giovanna le quedan 0");
await as(A, () => db.query(`select public.fulfill_redemption($1)`, [redPeli.id]));
ok((await one(`select status from public.redemptions where id = $1`, [redPeli.id])).status === "cumplido", "Luca marca el canje como cumplido");
const gMasaje = await as(B, () => one(`insert into public.store_items (title, cost) values ('Masajes de Gio', 3) returning *`));
const red = await as(A, () => one(`select * from public.redeem_item($1)`, [gMasaje.id]));
ok(red.status === "pendiente", "Luca canjea masajes (3) de la lista de Giovanna");
ok((await one(`select sum(amount)::int as s from public.point_events where user_id = $1`, [A])).s === 0, "a Luca le quedan 0");
await as(A, () => expectError(db.query(`insert into public.point_events (couple_id, user_id, amount, kind) values ($1, $2, 100, 'adjust')`, [couple.id, A]), /permission denied/, "nadie se puede regalar puntos"));
await as(A, () => db.query(`insert into public.store_items (title, emoji, cost) values ('Helado', '🍦', 4)`));
ok((await as(B, () => all(`select * from public.store_items where title = 'Helado'`))).length === 1, "Luca agrega un premio y Giovanna lo ve");
await as(C, () => expectError(db.query(`select public.redeem_item($1)`, [peli.id]), /item_not_found/, "C no puede canjear premios ajenos"));

// --- rachas ---
// A: hoy, ayer y hace 6-8 días (racha vieja de 3). B: solo hace 3 días (rechazada) → 0.
await db.exec(`insert into public.meals (user_id, couple_id, kind, photo_path, local_date) values
  ('${A}', '${couple.id}', 'fruta', 'x/a6.jpg', date '${today}' - 6),
  ('${A}', '${couple.id}', 'fruta', 'x/a7.jpg', date '${today}' - 7),
  ('${A}', '${couple.id}', 'fruta', 'x/a8.jpg', date '${today}' - 8)`);
const st = await as(A, () => all(`select * from public.couple_streaks()`));
const sa = st.find((r) => r.user_id === A), sb = st.find((r) => r.user_id === B);
ok(sa.current_streak === 2 && sa.best_streak === 3, `racha Luca: actual ${sa.current_streak} (esperado 2), mejor ${sa.best_streak} (esperado 3)`);
ok(sb.current_streak === 0 && sb.best_streak === 0, "racha Giovanna: 0 (su única comida fue rechazada)");
const st2 = await one(`select * from private.user_streaks($1, date '${today}' - 1)`, [A]);
ok(st2.current_streak === 1, "la racha sigue viva si el último día cumplido fue ayer");

// --- álbum ---
const keys = await all(`select w, private.album_key(w) as k from unnest(array['Dos Limones','frutillas','Tomates','una Banana','Maçã','kiwi']) as w`);
ok(keys.map((r) => r.k).join(",") === "limon,frutilla,tomate,banana,maca,kiwi", `álbum normaliza nombres: ${keys.map((r) => r.k).join(",")}`);
await db.exec(`insert into public.meals (user_id, couple_id, kind, description, photo_path, local_date) values
  ('${A}', '${couple.id}', 'ambas', '2 bananas y una manzana', 'x/al1.jpg', date '${today}' - 9),
  ('${A}', '${couple.id}', 'fruta', 'Banana', 'x/al2.jpg', date '${today}' - 10)`);
const album = await as(A, () => all(`select * from public.couple_album() where user_id = $1`, [A]));
const banana = album.find((r) => r.item === "banana");
ok(banana && banana.times === 2 && album.some((r) => r.item === "manzana"), `álbum de Luca: ${album.map((r) => `${r.item}×${r.times}`).join(", ")}`);
ok((await as(C, () => all(`select * from public.couple_album()`))).length === 0, "un tercero no ve el álbum");
await db.exec(`delete from public.meals where photo_path in ('x/al1.jpg', 'x/al2.jpg')`);

// --- resumen semanal ---
const monday = (await one(`select (date '${today}' - ((extract(isodow from date '${today}')::int + 6) % 7))::date as m`)).m;
const sums = await all(`select * from public.srv_weekly_summaries($1)`, [monday]);
ok(sums.length === 1 && sums[0].data.members.length === 2 && typeof sums[0].data.members[0].streak === "number", "resumen semanal con rachas");
console.log("   ", JSON.stringify(sums[0].data.members.map(({ meals, ...m }) => m)));
await all(`select * from public.srv_weekly_summaries($1)`, [monday]);
ok((await one(`select count(*)::int as n from public.weekly_summaries`)).n === 1, "regenerar el resumen no lo duplica");

// --- limpieza de fotos ---
const toClean = await all(`select * from public.srv_photos_to_cleanup(date '${today}')`);
ok(toClean.length === 5, `fotos anteriores a hoy para borrar: ${toClean.length}`);
const n = (await one(`select public.srv_mark_photos_deleted($1) as n`, [toClean.map((r) => r.id)])).n;
ok(n === 5, "fotos marcadas como borradas");
ok((await one(`select count(*)::int as n from public.meals`)).n === 6, "las comidas (data) siguen estando");

// --- notas de exámenes ---
const examPts = async (uid) => (await one(`select coalesce(sum(amount), 0)::int as s from public.point_events where user_id = $1 and exam_id is not null`, [uid])).s;
const analisis = await as(A, () => one(`insert into public.exams (subject, grade) values ('Análisis', 8) returning *`));
ok(analisis.user_id === A && analisis.review === null, "Luca carga un 8 en Análisis");
await as(A, () => expectError(db.query(`insert into public.exams (subject, grade) values ('Trampa', 11)`), /check/, "la nota no puede pasar de 10"));
await as(A, () => expectError(db.query(`insert into public.exams (subject, grade, review) values ('Trampa', 9, 'ok')`), /permission denied/, "no se puede autoaprobar una nota"));
await as(B, () => expectError(db.query(`insert into public.exams (subject, grade, user_id) values ('Trampa', 9, $1)`, [A]), /permission denied/, "no se puede cargar una nota a nombre del otro"));
await as(A, () => expectError(db.query(`select public.review_exam($1, 'ok')`, [analisis.id]), /own_exam/, "Luca no puede revisar su propia nota"));
await as(B, () => db.query(`select public.review_exam($1, 'ok')`, [analisis.id]));
ok((await examPts(A)) === 1 && (await examPts(B)) === 0, "Giovanna aprueba el 8 → +1 para Luca");
await as(B, () => db.query(`select public.review_exam($1, 'rejected')`, [analisis.id]));
ok((await examPts(A)) === 0, "si lo cambia a No cuenta, el punto se va");
await as(B, () => db.query(`select public.review_exam($1, 'ok')`, [analisis.id]));
await as(B, () => db.query(`select public.review_exam($1, 'ok')`, [analisis.id]));
ok((await examPts(A)) === 1, "aprobarla dos veces no duplica el punto");
const fisica = await as(A, () => one(`insert into public.exams (subject, grade) values ('Física', 5.5) returning *`));
await as(B, () => db.query(`select public.review_exam($1, 'ok')`, [fisica.id]));
ok((await examPts(B)) === 1 && (await examPts(A)) === 1, "Luca saca 5,5 en Física → +1 para Giovanna");
const seis = await as(B, () => one(`insert into public.exams (subject, grade) values ('Anatomia', 6) returning *`));
await as(A, () => db.query(`select public.review_exam($1, 'ok')`, [seis.id]));
ok((await examPts(B)) === 2, "un 6 justo aprueba → +1 para quien lo sacó");
await as(A, () => db.query(`delete from public.exams where id = $1`, [analisis.id]));
ok(!!(await one(`select id from public.exams where id = $1`, [analisis.id])), "una nota que ya dio puntos no se puede borrar");
const quimica = await as(A, () => one(`insert into public.exams (subject, grade) values ('Química', 7) returning *`));
await as(B, () => db.query(`delete from public.exams where id = $1`, [quimica.id]));
ok(!!(await one(`select id from public.exams where id = $1`, [quimica.id])), "Giovanna no puede borrar las notas de Luca");
await as(A, () => db.query(`delete from public.exams where id = $1`, [quimica.id]));
ok(!(await one(`select id from public.exams where id = $1`, [quimica.id])), "Luca borra su nota pendiente");
ok((await as(C, () => all(`select * from public.exams`))).length === 0, "un tercero no ve las notas");
await as(C, () => expectError(db.query(`select public.review_exam($1, 'rejected')`, [fisica.id]), /exam_not_found/, "un tercero no puede revisar notas"));
const historia = await as(A, () => one(`insert into public.exams (subject, grade) values ('Historia', 9) returning *`));
await db.query(`update public.exams set local_date = date '${today}' - 1 where id = $1`, [historia.id]);
await all(`select * from public.srv_close_day(date '${today}' - 1)`);
const hist = await one(`select review, review_auto from public.exams where id = $1`, [historia.id]);
ok(hist.review === "ok" && hist.review_auto && (await examPts(A)) === 2, "la nota que nadie revisó se aprueba sola en el cierre y da su punto");
await db.query(`update public.exams set local_date = date '${today}' - 3 where id = $1`, [fisica.id]);
await as(B, () => expectError(db.query(`select public.review_exam($1, 'rejected')`, [fisica.id]), /review_closed/, "después del cierre la nota ya no se puede cambiar"));
const ev = await one(`select kind, ref_date, source_user_id from public.point_events where exam_id = $1`, [fisica.id]);
ok(ev.kind === "exam" && ev.source_user_id === A, "el punto queda en el libro como nota");

// --- permisos de funciones del servidor ---
await as(A, () => expectError(db.query(`select * from public.srv_close_day(current_date)`), /permission denied/, "un usuario no puede correr el cierre del día"));

// --- storage ---
await as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('meal-photos', $1)`, [`${couple.id}/${A}/ok.jpg`]));
ok(true, "A sube foto en su carpeta");
await as(A, () => expectError(db.query(`insert into storage.objects (bucket_id, name) values ('meal-photos', $1)`, [`${couple.id}/${B}/no.jpg`]), /row-level security/, "A no sube en la carpeta de B"));
const seenByC = await as(C, () => all(`select * from storage.objects`));
ok(seenByC.length === 0, "C no ve fotos de la pareja");

console.log(failures ? `\n${failures} prueba(s) fallaron` : "\nTodo OK");
process.exit(failures ? 1 : 0);
