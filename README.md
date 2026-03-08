# Dansday – Discord Bot (Docker)

Discord bot management system with a web control panel: self-bot monitoring, official bot forwarding, leveling, giveaways, moderation, and more. Runs with Docker Compose.

## First time? What you need

| Need | Why |
|------|-----|
| Git | To clone the repo |
| Docker | To run the app |
| Docker Compose | To start the service (included with Docker Desktop) |
| Make | To run make up / make down (optional; built-in on macOS/Linux) |
| MySQL | Database; app connects via env vars |
| Redis (optional) | Sessions / rate limit; set `REDIS_URL` to use |

You do not need Node.js or npm installed — the app runs inside Docker.

Port **80** (or `CONTROL_PANEL_PORT`) must be free for the control panel.

## How to run (first time)

**Step 1 – Clone the repo**

```bash
git clone https://github.com/YOUR_USERNAME/Dansday-Discord-Bot.git
cd Dansday-Discord-Bot
```

**Step 2 – Configure environment**

Copy `.env.example` to `.env` and set your values. Required: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`. Optional: `REDIS_URL`, `TIMEZONE`, `MAIL_*`.

**Step 3 – Database**

Ensure MySQL is running and run the schema once: execute `database/schema.sql` in your MySQL client.

**Step 4 – Start**

```bash
make up
```

Or: `docker compose up -d --build`

Then open the control panel at **http://localhost** (or your `CONTROL_PANEL_PORT`).

**Stop:** `make down` or `docker compose down`

## What’s running (services)

| Service | Description |
|--------|-------------|
| **app** | Node.js control panel + official bot + self-bot. Single container, exposed on port 80 (or `CONTROL_PANEL_PORT`). Connects to MySQL (and optionally Redis) via env vars. |

MySQL and Redis are external; point the app at them with `DB_*` and `REDIS_URL`.

## Tech stack

- **Runtime:** Node.js 22
- **Control panel:** Express.js, session auth (MySQL or Redis)
- **Bots:** discord.js (official), discord.js-selfbot-v13 (self-bot)
- **Database:** MySQL (mysql2)
- **Email:** Nodemailer (optional)
- **Deploy:** Docker, Docker Compose

---

License: MIT · Author: Akbar Yudhanto · Version: 7.8.0
