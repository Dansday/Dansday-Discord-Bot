import { COMMUNICATION } from "../../config.js";
import logger from "../../logger.js";

let webhookServer = null;
let client = null;

function getClientIp(req) {
    const address = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
    return address.startsWith('::ffff:') ? address.slice(7) : address || 'unknown';
}

async function handleWebhookRequest(req, res) {
    try {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        const secretKey = req.headers['x-secret-key'];
        if (!secretKey || secretKey !== COMMUNICATION.SECRET_KEY) {
            await logger.log(`❌ Webhook unauthorized access attempt from ${getClientIp(req)}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);

                if (payload.type === 'message_forward' && payload.data) {
                    try {
                        await logger.log(`📥 Received message_forward webhook: channel ${payload.data.channel?.id} in guild ${payload.data.guild?.id}`);

                        const { processMessageFromSelfBot } = await import('./forwarder.js');
                        await processMessageFromSelfBot(payload.data, client);

                        await logger.log(`✅ Successfully processed message_forward webhook`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Message processed' }));
                    } catch (forwardErr) {
                        await logger.log(`❌ Failed to process message: ${forwardErr.message}`);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to process message', details: forwardErr.message }));
                    }
                } else {
                    await logger.log(`❌ Invalid payload format: ${JSON.stringify(payload)}`);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid payload format' }));
                }
            } catch (parseErr) {
                await logger.log(`❌ Webhook parse error: ${parseErr.message}`);
                await logger.log(`❌ Raw body: ${body}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } catch (err) {
        await logger.log(`❌ Webhook error: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

function startWebhookServer(discordClient) {
    client = discordClient;

    if (COMMUNICATION.WEBHOOK_URL) {
        const port = COMMUNICATION.PORT;

        import('http').then(http => {
            webhookServer = http.createServer(handleWebhookRequest);

            webhookServer.listen(port, () => {
                logger.log(`🌐 Webhook server started on port ${port}`);
                logger.log(`📡 Listening for messages at ${COMMUNICATION.WEBHOOK_URL}`);
            });

            webhookServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.log(`❌ Port ${port} is already in use. Trying port ${port + 1}...`);
                    webhookServer.listen(port + 1, () => {
                        logger.log(`🌐 Webhook server started on port ${port + 1}`);
                        logger.log(`📡 Listening for messages at ${COMMUNICATION.WEBHOOK_URL}`);
                    });
                } else {
                    logger.log(`❌ Webhook server error: ${err.message}`);
                }
            });
        });
    }
}

function stopWebhookServer() {
    if (webhookServer) {
        webhookServer.close();
        webhookServer = null;
        logger.log(`🛑 Webhook server stopped`);
    }
}

export default {
    startWebhookServer,
    stopWebhookServer
};
