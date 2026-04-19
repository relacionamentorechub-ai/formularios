export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username required' });
  }

  const handle = username.replace('@', '').trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  try {
    const response = await fetch(`https://www.instagram.com/${handle}/`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (response.status === 404) {
      return res.status(200).json({ exists: false });
    }

    if (response.status === 200) {
      const text = await response.text();
      // Instagram returns 200 with "Sorry, this page isn't available" for non-existent profiles
      const notFound = text.includes("Sorry, this page isn\\'t available") ||
                       text.includes('Page Not Found') ||
                       text.includes('"error_title"');
      return res.status(200).json({ exists: !notFound });
    }

    // Rate limited or login wall — can't determine
    return res.status(200).json({ exists: null });
  } catch (e) {
    return res.status(200).json({ exists: null });
  }
}
