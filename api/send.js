// Vercel serverless — sends message/photo/audio/video/document
export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const AGENT_KEY = process.env.AGENT_KEY || '';
  const DEFAULT_CHAT = process.env.TELEGRAM_CHAT_ID || '';

  if (!TOKEN) return res.status(500).json({ error: 'Bot token not configured' });

  try {
    const { key, type, chatId, text, caption, data, filename, duration } = req.body || {};

    if (AGENT_KEY && key !== AGENT_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const target = String(DEFAULT_CHAT || chatId || '').trim();
    if (!target) return res.status(400).json({ error: 'chatId required' });

    let endpoint, form, jsonBody;

    if (type === 'message') {
      endpoint = 'sendMessage';
      jsonBody = {
        chat_id: target,
        text: String(text || '').slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };
    } else {
      form = new FormData();
      form.append('chat_id', target);

      if (type === 'photo') {
        endpoint = 'sendPhoto';
        form.append('caption', (caption || '').slice(0, 1024));
        const buf = Buffer.from(data.split(',')[1], 'base64');
        form.append('photo', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');
      } else if (type === 'audio') {
        endpoint = 'sendAudio';
        form.append('caption', (caption || '').slice(0, 1024));
        form.append('duration', String(duration || 0));
        const buf = Buffer.from(data.split(',')[1], 'base64');
        form.append('audio', new Blob([buf], { type: 'audio/webm' }), 'audio.webm');
      } else if (type === 'video') {
        endpoint = 'sendVideo';
        form.append('caption', (caption || '').slice(0, 1024));
        form.append('duration', String(duration || 0));
        const buf = Buffer.from(data.split(',')[1], 'base64');
        form.append('video', new Blob([buf], { type: 'video/webm' }), 'video.webm');
      } else if (type === 'document') {
        endpoint = 'sendDocument';
        form.append('caption', (caption || '').slice(0, 1024));
        const buf = Buffer.from(data.split(',')[1], 'base64');
        form.append('document', new Blob([buf]), filename || 'file.bin');
      } else {
        return res.status(400).json({ error: 'Unknown type' });
      }
    }

    const url = `https://api.telegram.org/bot${TOKEN}/${endpoint}`;
    const r = jsonBody
      ? await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonBody)
        })
      : await fetch(url, { method: 'POST', body: form });

    const result = await r.json();

    if (!result.ok) {
      return res.status(400).json({ error: result.description || 'Telegram error' });
    }

    return res.status(200).json({ success: true, messageId: result.result?.message_id });
  } catch (e) {
    console.error('send error:', e);
    return res.status(500).json({ error: e.message });
  }
}
