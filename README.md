# Goblox Bot System

A Discord bot system that separates self-bot monitoring from official bot forwarding for better security and maintainability.

## Architecture

### Self-Bot (`self-bot/`)
- **Purpose**: Monitors source Discord servers for new messages
- **Technology**: `discord.js-selfbot-v13`
- **Functionality**: 
  - Listens to configured source channels
  - Processes messages and sends data to official bot
  - Handles historical message fetching

### Official Bot (`official-bot/`)
- **Purpose**: Forwards messages to target channels and welcomes new users
- **Technology**: `discord.js` (official bot)
- **Functionality**:
  - Receives message data from self-bot
  - Forwards messages to target channels with role mentions
  - Welcomes new users with random messages

## Project Structure

```
goblox-bot/
├── main.js                 # Launcher script
├── package.json           # Single package.json with all dependencies
├── shared-config.js       # Shared configuration
├── logger.js              # Shared logger utility
├── utils.js               # Shared utilities
├── json/                  # JSON data storage
│   ├── forwarded.json    # Forwarded messages tracking
│   └── welcomed.json     # Welcomed users tracking
├── self-bot/
│   ├── main.js           # Self-bot entry point
│   └── components/
│       └── forwarder.js  # Message monitoring component
└── official-bot/
    ├── main.js           # Official bot entry point
    └── components/
        ├── forwarder.js  # Message forwarding component
        ├── welcomer.js   # User welcoming component
        └── webhook.js    # Webhook server component
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```
   
   > **Note**: This project uses a single `package.json` file for direct admin hosting compatibility.

2. **Configure environment**:
   - Edit `shared-config.js`
   - Set `ENV.PRODUCTION` to `true` for production or `false` for testing
   - Set `ENV.SECRET_KEY` for webhook authentication

3. **Configure tokens**:
   - Set `SELF_BOT_TOKEN` (your self-bot token)
   - Set `OFFICIAL_BOT_TOKEN` (your official bot token)

4. **Configure communication**:
   - Set `COMMUNICATION.WEBHOOK_URL` to your website endpoint

## Usage

### Start both bots:
```bash
npm start
```

### Start individual bots:
```bash
npm run start:selfbot    # Self-bot only
npm run start:official   # Official bot only
```

### Development mode (with auto-restart):
```bash
npm run dev
```

## Communication Method

### Webhook Communication
- Self-bot sends message data via HTTP POST to your website (`goblox.dansday.com/api/webhook`)
- Official bot runs a webhook server to receive the data
- **Secret key authentication** - only authorized self-bot can access webhook
- Real-time communication for instant message forwarding
- Configured in `shared-config.js` with `COMMUNICATION.WEBHOOK_URL`

## Environment Configuration

### Production vs Testing
- **Production Mode** (`ENV.PRODUCTION: true`): Uses all source channels for full functionality
- **Testing Mode** (`ENV.PRODUCTION: false`): Uses only test channels for safe testing
- Easy switching between environments by changing one flag

### Security
- **Secret Key Authentication**: Webhook requires `X-Secret-Key` header
- **Unauthorized Access Logging**: Failed authentication attempts are logged
- **Secure Communication**: Only self-bot with correct secret key can send data

## Configuration

All configuration is centralized in `shared-config.js`:

- **Source Channels**: Configure which channels to monitor
- **Target Channels**: Configure where to forward messages
- **Role Mentions**: Configure role mentions for each group
- **Welcome Messages**: Configure welcome message templates
- **Excluded Users**: Configure users to exclude from forwarding

## Data Management

### JSON Storage
- **Location**: All JSON files are stored in the `json/` subfolder
- **Files**:
  - `json/forwarded.json` - Tracks forwarded messages to prevent duplicates
  - `json/welcomed.json` - Tracks welcomed users to prevent duplicate welcomes
- **Auto-creation**: JSON directory and files are created automatically if they don't exist
- **Persistence**: Data persists between bot restarts for reliable operation

## Security Benefits

1. **Separation of Concerns**: Self-bot only monitors, official bot only forwards
2. **Token Isolation**: Self-bot and official bot use different tokens
3. **Reduced Risk**: Official bot doesn't need access to source servers
4. **Better Logging**: Clear separation of monitoring vs forwarding logs

## Components

Each feature is organized as a component for easy maintenance:

- **Forwarder Component**: Handles message processing and forwarding
- **Welcomer Component**: Handles new user welcoming
- **Logger Component**: Centralized logging system

## Troubleshooting

1. **Self-bot not receiving messages**: Check source channel IDs and permissions
2. **Official bot not forwarding**: Check target channel IDs and bot permissions
3. **Communication issues**: Verify webhook URL or shared storage path
4. **Token issues**: Ensure tokens are valid and have proper permissions
