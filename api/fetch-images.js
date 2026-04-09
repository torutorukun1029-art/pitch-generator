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
    return res.status(200).json({ images: {} });
  }

  try {
    const res2 = await fetch(hpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PitchGenerator/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res2.ok) return res.status(200).json({ images: {} });

    const html = await res2.text();
    const baseUrl = new URL(hpUrl).origin;

    // OGP画像（最優先・サイト代表画像）
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    let ogImage = ogMatch ? ogMatch[1] : null;
    if (ogImage && ogImage.startsWith('/')) ogImage = baseUrl + ogImage;
    if (ogImage && ogImage.startsWith('//')) ogImage = 'https:' + ogImage;

    // ロゴを探す（class/alt/srcにlogoを含むもの）
    let logoUrl = null;
    const logoRegex = /<img[^>]+>/gi;
    let lm;
    while ((lm = logoRegex.exec(html)) !== null) {
      const tag = lm[0];
      const srcM = tag.match(/src=["']([^"']+)["']/i);
      if (!srcM) continue;
      let src = srcM[1];
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = baseUrl + src;
      else if (!src.startsWith('http')) src = baseUrl + '/' + src;
      const alt = (tag.match(/alt=["']([^"']*)["']/i)?.[1] || '').toLowerCase();
      const cls = (tag.match(/class=["']([^"']*)["']/i)?.[1] || '').toLowerCase();
      const srcL = src.toLowerCase();
      if (alt.includes('logo') || cls.includes('logo') || srcL.includes('logo')) {
        logoUrl = src;
        break;
      }
    }

    // 写真を探す（width/heightが大きいもの優先）
    const photoUrls = [];
    const imgRegex = /<img[^>]+>/gi;
    let im;
    // スキップするキーワード
    const skipKw = ['icon','favicon','arrow','btn','button','close','menu','search',
      'sns','twitter','facebook','instagram','line','youtube','blank','loading',
      'sprite','logo','banner','ad','gif','pixel','spacer','1x1','dot','star',
      'check','mark','badge','tag','label','bg','background','pattern'];

    while ((im = imgRegex.exec(html)) !== null) {
      const tag = im[0];
      const srcM = tag.match(/src=["']([^"']+)["']/i);
      if (!srcM) continue;
      let src = srcM[1];

      // スキップチェック
      const skip = skipKw.some(k => src.toLowerCase().includes(k));
      if (skip) continue;

      // 相対URL変換
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = baseUrl + src;
      else if (!src.startsWith('http')) src = baseUrl + '/' + src;

      // 拡張子チェック（jpgとpngのみ・webpはぼやけることがあるので後回し）
      const ext = src.split('?')[0].split('.').pop().toLowerCase();
      if (!['jpg','jpeg','png'].includes(ext)) continue;

      // widthとheightを取得して小さい画像を除外
      const wM = tag.match(/width=["']?(\d+)["']?/i);
      const hM = tag.match(/height=["']?(\d+)["']?/i);
      const w = wM ? parseInt(wM[1]) : 999;
      const h = hM ? parseInt(hM[1]) : 999;
      if (w < 200 || h < 150) continue; // 小さい画像を除外

      photoUrls.push(src);
      if (photoUrls.length >= 10) break;
    }

    // 画像をbase64に変換
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

        // 画像サイズチェック（50KB未満はスキップ）
        if (buffer.byteLength < 50000) return null;

        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
      } catch (e) {
        return null;
      }
    }

    // 取得対象を組み立て（ロゴはlogoスロットのみ・他スロットには入れない）
    const results = {};
    const fetchTargets = [];

    // ロゴはlogoスロットのみ（サイズチェック緩め・20KB以上）
    if (logoUrl) fetchTargets.push({ key: 'logo', url: logoUrl, minSize: 20000 });
    // OGP画像はcoverスロット
    if (ogImage) fetchTargets.push({ key: 'cover', url: ogImage, minSize: 50000 });
    // サイト内写真（ロゴURLと被らないものだけ）
    const otherKeys = ['company', 'biz1', 'culture'];
    photoUrls.filter(u => u !== logoUrl && u !== ogImage).slice(0, 6).forEach((url, i) => {
      if (i < otherKeys.length) fetchTargets.push({ key: otherKeys[i], url, minSize: 50000 });
    });

    // 並行で取得（最大5枚）
    await Promise.allSettled(
      fetchTargets.slice(0, 5).map(async ({ key, url, minSize }) => {
        try {
          const imgRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PitchGenerator/1.0)' },
            signal: AbortSignal.timeout(5000)
          });
          if (!imgRes.ok) return;
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          if (!contentType.startsWith('image/')) return;
          const buffer = await imgRes.arrayBuffer();
          if (buffer.byteLength < minSize) return;
          const base64 = Buffer.from(buffer).toString('base64');
          results[key] = `data:${contentType};base64,${base64}`;
        } catch(e) {}
      })
    );

    return res.status(200).json({ images: results });

  } catch (e) {
    return res.status(200).json({ images: {} });
  }
};
