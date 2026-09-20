export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ok: true,
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    chatIdSet: !!process.env.TELEGRAM_CHAT_ID,
    authRequired: !!process.env.AGENT_KEY,
    version: '3.0.0',
    time: new Date().toISOString()
  });
}
