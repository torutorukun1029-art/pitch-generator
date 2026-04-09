// HPから画像URLを取得するAPI
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { hpUrl, password } = req.body;
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!hpUrl || !hpUrl.startsWith('http')) {
    return res.status(400).json({ images: {} });
  }

  try {
    const res2 = await fetch(hpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PitchGenerator/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res2.ok) return res.status(200).json({ images: {} });

    const html = await res2.text();
    const baseUrl = new URL(hpUrl).origin;

    // 画像URLを抽出
    const imgUrls = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      let src = match[0];
      let url = match[1];

      // 小さいアイコン・ロゴ類をスキップするキーワード
      const skipKeywords = ['icon', 'favicon', 'logo', 'arrow', 'btn', 'button', 'close', 'menu', 'search', 'sns', 'twitter', 'facebook', 'instagram', 'line', 'youtube', 'blank', 'loading', 'sprite'];
      const skip = skipKeywords.some(k => url.toLowerCase().includes(k));
      if (skip) continue;

      // 相対URLを絶対URLに変換
      if (url.startsWith('//')) url = 'https:' + url;
      else if (url.startsWith('/')) url = baseUrl + url;
      else if (!url.startsWith('http')) url = baseUrl + '/' + url;

      // 画像拡張子チェック
      const ext = url.split('?')[0].split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) continue;

      // alt属性を取得
      const altMatch = src.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1].toLowerCase() : '';

      imgUrls.push({ url, alt });
      if (imgUrls.length >= 30) break;
    }

    // OGP画像（メイン画像として最優先）
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const ogImage = ogMatch ? ogMatch[1] : null;

    // ロゴ画像を取得
    let logoUrl = null;
    const logoRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let logoMatch;
    while ((logoMatch = logoRegex.exec(html)) !== null) {
      const src = logoMatch[1];
      const fullSrc = src.startsWith('//') ? 'https:' + src : src.startsWith('/') ? baseUrl + src : src.startsWith('http') ? src : baseUrl + '/' + src;
      const alt = logoMatch[0].match(/alt=["']([^"']*)["']/i)?.[1]?.toLowerCase() || '';
      const classMatch = logoMatch[0].match(/class=["']([^"']*)["']/i)?.[1]?.toLowerCase() || '';
      if (alt.includes('logo') || classMatch.includes('logo') || fullSrc.toLowerCase().includes('logo')) {
        logoUrl = fullSrc;
        break;
      }
    }

    // 画像を実際に取得してbase64に変換する関数
    async function fetchImageAsBase64(imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PitchGenerator/1.0)' },
          signal: AbortSignal.timeout(5000)
        });
        if (!imgRes.ok) return null;
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) return null;
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
      } catch (e) {
        return null;
      }
    }

    // 画像を取得（並行処理・最大5枚）
    const results = {};
    const fetchTargets = [];

    // ロゴ
    if (logoUrl) fetchTargets.push({ key: 'logo', url: logoUrl });
    // OGP画像（表紙に使用）
    if (ogImage) fetchTargets.push({ key: 'cover', url: ogImage });
    // その他の画像（最大3枚）
    const otherKeys = ['company', 'biz1', 'culture'];
    imgUrls.slice(0, 8).forEach((img, i) => {
      if (i < otherKeys.length && !results[otherKeys[i]]) {
        fetchTargets.push({ key: otherKeys[i], url: img.url });
      }
    });

    // 並行で取得（最大5枚）
    await Promise.allSettled(
      fetchTargets.slice(0, 5).map(async ({ key, url }) => {
        const b64 = await fetchImageAsBase64(url);
        if (b64) results[key] = b64;
      })
    );

    return res.status(200).json({ images: results });

  } catch (e) {
    return res.status(200).json({ images: {} });
  }
};
