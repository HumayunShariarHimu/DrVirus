// Vercel serverless — proxies Telegram getUpdates (long-poll)
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const AGENT_KEY = process.env.AGENT_KEY || '';
  const ALLOWED_CHAT = process.env.TELEGRAM_CHAT_ID || '';

  if (!TOKEN) return res.status(500).json({ error: 'Bot token not configured' });

  const key = req.query.key || '';
  if (AGENT_KEY && key !== AGENT_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const offset = req.query.offset || '0';
  const timeout = Math.min(parseInt(req.query.timeout) || 8, 9);

  try {
    const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&timeout=${timeout}&allowed_updates=["message"]`;
    const r = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout((timeout + 3) * 1000)
    });
    const data = await r.json();

    if (!data.ok) {
      return res.status(400).json({ error: data.description || 'getUpdates failed' });
    }

    // Filter to allowed chat and commands only
    const updates = (data.result || []).filter(u => {
      const m = u.message;
      if (!m || !m.text) return false;
      if (ALLOWED_CHAT && String(m.chat.id) !== String(ALLOWED_CHAT)) return false;
      return m.text.startsWith('/');
    }).map(u => ({
      id: u.update_id,
      chatId: u.message.chat.id,
      text: u.message.text
    }));

    return res.status(200).json({ updates });
  } catch (e) {
    // timeout on long-poll is normal — return empty
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return res.status(200).json({ updates: [] });
    }
    return res.status(500).json({ error: e.message });
  }
}
