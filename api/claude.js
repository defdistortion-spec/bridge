// Vercel Function - Claude APIのプロキシ（ユーザーのAPIキーを使用）
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, useSearch, apiKey } = req.body;

  // APIキーの優先順位：リクエストのキー → 環境変数
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: 'API key required' });

  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages,
    };
    if (useSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const texts = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    return res.status(200).json({ text: texts.join('') || '' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
