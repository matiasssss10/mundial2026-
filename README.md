# ⚽ Mundial 2026 IA Predictor

App Next.js completa que proyecta estadísticamente los 104 partidos del Mundial 2026.
Motor xG + ELO + Poisson + Monte Carlo + Notificaciones Telegram + COP.

---

## ⚡ Inicio en 4 comandos

```bash
npm install
cp .env.example .env.local        # edita con tus claves
npx tsx scripts/seed.ts            # carga 48 equipos + 72 partidos
npx tsx scripts/cron.ts            # calcula predicciones
npm run dev                        # abre http://localhost:3000
```

---

## 📱 Configurar Telegram (10 minutos)

### Paso 1 — Crear el bot
```
1. Telegram → busca @BotFather
2. Envía /newbot
3. Dale nombre: "Mundial2026 Predictor"
4. Username: "mundial2026_pred_bot"
5. Copia el TOKEN
```

### Paso 2 — Obtener tu Chat ID
```
Opción A: Habla con @userinfobot → te da tu ID directamente
Opción B: Envía /start a tu bot, luego abre:
  https://api.telegram.org/bot{TOKEN}/getUpdates
  Busca "chat":{"id": ESTE_NUMERO}
```

### Paso 3 — Canal de Telegram (opcional)
```
1. Crea un canal en Telegram
2. Añade tu bot como administrador (permisos: publicar mensajes)
3. El ID del canal empieza con -100...
```

### Paso 4 — .env.local
```env
TELEGRAM_BOT_TOKEN=7234567890:AAF-tu-token-real
TELEGRAM_CHAT_ID=123456789
TELEGRAM_CHANNEL_ID=-100987654321    # opcional
TELEGRAM_PREVIEW_HOURS=2             # horas antes del partido
```

### Paso 5 — Probar
```bash
npx tsx scripts/tg-test.ts
```

El asistente verifica la conexión y envía una previa de ejemplo a tu Telegram.

---

## 🤖 Qué envía el bot automáticamente

| Cuándo | Qué |
|--------|-----|
| 06:00 cada día | Resumen matutino: partidos del día + favoritos |
| N horas antes de cada partido | Previa completa con probabilidades, histórico y apuestas de valor |
| Con previas | Combinadas del día con EV positivo |
| Al acabar partido | Resultado final vs predicción del modelo |

### Formato de la previa en Telegram:
- Probabilidades 1X2 con barras visuales
- xG esperado de cada equipo
- Mercados clave: +2.5, BTTS, clean sheet
- Top 3 marcadores exactos más probables
- Histórico mundialista de ambos equipos
- Apuestas con edge matemático positivo
- Ejemplo de ganancia en COP por $50.000

---

## 📁 Estructura del proyecto

```
wc2026/
├── app/
│   ├── page.tsx                   # Home: Monte Carlo + próximos partidos
│   ├── grupo/[code]/page.tsx      # Vista de grupo con tabla + fixtures
│   ├── partido/[id]/page.tsx      # Partido: todos los mercados + análisis
│   ├── telegram/page.tsx          # Panel de control del bot
│   └── api/
│       ├── cron/route.ts          # Vercel Cron (diario 06:00 UTC)
│       └── telegram/route.ts      # API de gestión Telegram
├── lib/
│   ├── db/index.ts                # SQLite (better-sqlite3, 9 tablas)
│   ├── model/
│   │   ├── poisson.ts             # Motor xG + Poisson + ELO
│   │   ├── derived.ts             # Tarjetas, córners, goleadores
│   │   └── montecarlo.ts          # 10.000 simulaciones del torneo
│   ├── data/
│   │   ├── api.ts                 # API-Football con retry + caché
│   │   └── telegram.ts            # Servicio Telegram completo
│   └── utils.ts                   # COP, odds, EV, Kelly, utils
├── scripts/
│   ├── seed.ts                    # 48 equipos + 72 fixtures iniciales
│   ├── cron.ts                    # Pipeline diario completo
│   └── tg-test.ts                 # Asistente configuración Telegram
├── vercel.json                    # Cron: 06:00 UTC diario
└── .env.example                   # Plantilla de variables
```

---

## 🧮 El modelo explicado

### Lambda (goles esperados por equipo)
```
λ = (xG_ataque × xG_def_rival / media_liga) × sede × forma × ELO_adj

Donde:
- xG_ataque     = promedio histórico mundialista del equipo
- xG_def_rival  = goles concedidos/partido del equipo rival
- media_liga    = 1.35 (media en Mundiales)
- sede          = +2% a +15% para co-anfitriones USA/MEX/CAN
- forma         = 0.92 a 1.08 según últimos 5 resultados
- ELO_adj       = 0.88 a 1.12 según diferencia de rating ELO
```

### Distribución de Poisson
Con λ_home y λ_away se genera una matriz 9×9 de probabilidades de marcadores exactos. De esa matriz se derivan TODOS los mercados: 1X2, over/under, BTTS, clean sheet, marcador exacto.

### ELO
Ratings de 1695 (Curazao) a 2082 (España). La diferencia ELO ajusta los lambdas y determina el favorito en los penaltis del Monte Carlo.

### Monte Carlo
10.000 simulaciones del torneo completo (grupos → R32 → R16 → QF → SF → Final). Resultado: probabilidad de campeón, final, semifinal, cuartos y clasificación de grupos para los 48 equipos.

### Confianza del modelo
- **Alta (≥75%)**: diferencia ELO > 200 pts — resultado muy predecible
- **Media (55-75%)**: diferencia ELO 50-200 pts
- **Baja (<55%)**: partidos equilibrados — tarjetas y córners siempre baja confianza

---

## 🚀 Deploy en Vercel

```bash
npm i -g vercel
vercel

# En Vercel Dashboard → Settings → Environment Variables:
# Añade todas las variables de .env.local
# El cron se activa automáticamente (vercel.json → 06:00 UTC = 01:00 Colombia)
```

---

## 🔌 APIs de datos en vivo

| API | Plan | Uso |
|-----|------|-----|
| API-Football (RapidAPI) | Free: 100 req/día · Pro: $10/mes | Principal — stats en vivo |
| football-data.org | Free: 10 req/min | Fallback — fixtures y resultados |

El plan free es suficiente para el cron diario (~15-20 requests).
Para estadísticas en tiempo real durante partidos → plan Pro de API-Football.

---

## ⚠️ Disclaimer

**Análisis estadístico de entretenimiento. No es asesoría de apuestas.**
Los resultados reales pueden diferir significativamente de las proyecciones.
Las apuestas deportivas conllevan riesgo real de pérdida total. Solo mayores de 18 años.
