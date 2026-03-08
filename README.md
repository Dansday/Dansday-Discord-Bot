# Dansday – Discord Bot (Coolify / Docker)

Discord bot management system with a web control panel: self-bot monitoring, official bot forwarding, leveling, giveaways, moderation, and more. Deploy with Docker Compose on Coolify; MySQL and Redis are Coolify resources.

## First time? What you need

| Need | Why |
|------|-----|
| Git | To clone and push the repo |
| Coolify | To deploy and run the app (builds via Docker) |
| MySQL in Coolify | Database (create a MySQL resource; use its internal hostname in env) |
| Redis in Coolify (optional) | For future use; set `REDIS_URL` if you add it |

You do not need Node.js or MySQL installed locally — the app runs in Docker on Coolify.

Port **80** (or your `CONTROL_PANEL_PORT`) is used by the control panel.

## How to run (Coolify)

**Step 1 – Clone the repo**

```bash
git clone https://github.com/YOUR_USERNAME/Dansday-Discord-Bot.git
cd Dansday-Discord-Bot
```

**Step 2 – Push to GitHub**

Connect the repo to GitHub and push. In Coolify, create an application from this GitHub repo.

**Step 3 – Compose file**

In Coolify, set the compose file to **`docker-compose.yaml`**. Ensure the app uses the **coolify** network (the compose file already does).

**Step 4 – Environment variables**

Set these in Coolify (Application → Environment Variables):

- **Required:** `DB_HOST`, `DB_PORT` (3306), `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`
- **Optional:** `REDIS_URL`, `CONTROL_PANEL_PORT`, `TIMEZONE`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`

Use the **internal** MySQL hostname from your Coolify MySQL resource (eye icon on Internal URL → hostname between `@` and `:3306`). Enable “Connect to Predefined Networks” for the app if needed so it can reach MySQL/Redis.

**Step 5 – Deploy**

Deploy (or use GitHub auto-deploy). Run the schema once on your MySQL (e.g. via phpMyAdmin): execute `database/schema.sql`.

Then open the control panel at the URL Coolify gives you.

**Stop:** In Coolify, stop the application or delete the deployment.

## What’s running (services)

| Service | Description |
|--------|-------------|
| **app** | Node.js control panel + official bot + self-bot logic. Single container, exposed on `CONTROL_PANEL_PORT` (default 80). |
| **MySQL** | In Coolify (separate resource). App connects via `DB_HOST` (internal hostname). |
| **Redis** | In Coolify (optional, separate resource). Set `REDIS_URL` if you use it. |

## Tech stack

- **Runtime:** Node.js 20
- **Control panel:** Express.js, session auth
- **Bots:** discord.js (official), discord.js-selfbot-v13 (self-bot)
- **Database:** MySQL (via mysql2)
- **Email:** Nodemailer (optional)
- **Deploy:** Docker, Docker Compose (docker-compose.yaml), Coolify

---

License: MIT · Author: Akbar Yudhanto · Version: 7.8.0
