// Vercel Function - Gemini APIのプロキシ
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, apiKey, useSearch } = req.body || {};

  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  try {
    const lastMessage = messages?.[messages.length - 1]?.content || "";
    const body = {
      contents: [{ parts: [{ text: lastMessage }] }],
      generationConfig: { maxOutputTokens: 600 },
    };
    if (useSearch) body.tools = [{ google_search: {} }];

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return res.status(400).json({ error: data.error.message || JSON.stringify(data.error) });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (error) {
    console.error('Gemini fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
