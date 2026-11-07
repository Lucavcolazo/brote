# Brote 🌱

App web mobile (PWA) para Luca y Giovanna: cada día cada uno sube una foto de la fruta o verdura que comió.
Si alguien pasa un día sin subir nada (o el otro le rechaza la foto), **el otro suma 1 punto**. Los puntos se canjean en la tienda.

- **Feed**: lo que sube cada uno, con foto. El otro lo aprueba (✅ Vale) o lo rechaza (❌ No cuenta).
- **Tienda**: premios editables con costo en puntos. Al canjear, al otro le llega un aviso y queda como "pendiente" hasta que se cumple.
- **Semana**: calendario de la semana, resúmenes de semanas pasadas y movimientos de puntos.
- **Yo**: perfil, idioma (Español / Português BR) y notificaciones.

## Cómo funciona el tiempo (hora argentina)

| Cuándo | Qué pasa |
|---|---|
| Todos los días 12:30 | Recordatorio a quien no subió nada |
| Todos los días 21:30 | "Última llamada" |
| Todos los días 10:00 | Se cierra **el día anterior** y se reparten los puntos (hasta esa hora se puede cargar lo de ayer) |
| Domingo 21:00 | Resumen semanal (puntos + comidas) |
| Miércoles 04:00 | Se borran las fotos de las semanas ya resumidas. **La data queda**, solo se van las imágenes |

Los horarios están en [supabase/cron.sql](supabase/cron.sql) y la hora de gracia en la migración (`private.grace_hour()`).
Las notificaciones le llegan a cada uno en su idioma.

## Probar sin configurar nada (modo demo)

```bash
npm install
```

```bash
npm run dev
```

Sin `.env` arranca en modo demo, con datos de mentira y sin contraseña.

## Puesta en marcha real

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá y ejecutá [supabase/migrations/20261106000000_brote.sql](supabase/migrations/20261106000000_brote.sql).
3. **Authentication → Sign In / Providers**: desactivá *Allow new users to sign up* (la app es cerrada).
4. **Authentication → Users → Add user**: creá las 2 cuentas (email + contraseña, marcá *Auto Confirm User*).

### 2. Claves para notificaciones

```bash
npm run vapid
```

Te da una *Public Key* y una *Private Key*. Inventá también un `CRON_SECRET` largo (por ejemplo con `openssl rand -hex 32`).

### 3. Edge function `push`

En **Edge Functions → Secrets** cargá:

- `CRON_SECRET` = el que inventaste
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` = las del paso 2
- `VAPID_SUBJECT` = la URL de la app (ej. `https://brote.vercel.app`)

Deploy (con la CLI, `npx supabase login` la primera vez):

```bash
npx supabase functions deploy push --no-verify-jwt --project-ref TU-PROJECT-REF
```

O desde el dashboard: *Edge Functions → Deploy a new function → Via editor*, nombre `push`, pegá [supabase/functions/push/index.ts](supabase/functions/push/index.ts) y desactivá *Verify JWT*.

### 4. Horarios

Editá las dos primeras variables de [supabase/cron.sql](supabase/cron.sql) (URL del proyecto y `CRON_SECRET`) y ejecutalo en el SQL Editor.

### 5. Frontend en Vercel

Importá el repo en Vercel (detecta Vite solo) y cargá las variables de [.env.example](.env.example):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_LUCA_EMAIL`, `VITE_GIOVANNA_EMAIL`.

### 6. En los celulares

- **iPhone** (iOS 16.4+): abrir en Safari → Compartir → *Agregar a pantalla de inicio* → abrir desde el ícono → **Yo → Activar notificaciones**. En iPhone las notificaciones solo funcionan con la app instalada así.
- **Android**: abrir en Chrome → *Instalar app* → **Yo → Activar notificaciones**.

## Probar las tareas programadas a mano

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/push \
  -H "x-cron-secret: TU_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"action":"remind","slot":"midday"}'
```

Otras acciones: `close_day` (opcional `"date":"2026-11-05"`), `weekly_summary`, `cleanup_photos`.

## Desarrollo

- `npm run test:sql`: corre la migración en un Postgres embebido y prueba puntos, permisos, tienda, resumen y limpieza de fotos.
- `npm run check:i18n`: avisa si algún texto de la UI no tiene traducción al portugués.
- Textos: [src/i18n.tsx](src/i18n.tsx) (la clave es el texto en español).
- Estilos: [src/styles.css](src/styles.css); los colores están como variables arriba de todo.
- Perfiles (nombre, emoji, idioma por defecto): [src/config.ts](src/config.ts).
