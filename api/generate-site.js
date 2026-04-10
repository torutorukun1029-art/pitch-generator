// 採用特設サイトHTMLを生成するAPI
// DESIGN.md準拠：SmartHR Japanese Typography + frontend-design skill
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { data, password } = req.body;
  if (password !== process.env.APP_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const e = data;
  const cn = e.companyName || '会社名';
  const prefixes = ['株式会社','合同会社','有限会社','一般社団法人','特定非営利活動法人','NPO法人'];
  const prefix = prefixes.find(p => cn.startsWith(p)) || '';
  const shortName = prefix ? cn.replace(prefix, '').trim() : cn;
  const services = (e.services || []).filter(s => s.title && s.title.trim());
  const wantedList = (e.wantedList || []).filter(v => v && v.trim());
  const benefits = (e.benefits || []).filter(b => b && b.trim());
  const holidays = (e.holidays || []).filter(h => h && h.trim());
  const vc = (e.careerPath || []).filter(s => s && s.title && s.title.trim());
  const isHourly = e.salaryUnit === '時給' || e.salaryUnit === '日給';
  const sUnit = isHourly ? '円' : '万円';
  const stl = isHourly ? (e.salaryUnit + 'レンジ') : e.salaryUnit === '年俸' ? '年俸レンジ' : '月給レンジ';
  const sMin = parseInt(e.salaryMin) || 0;
  const sMax = parseInt(e.salaryMax) || 0;
  const iv = e.interview || {};
  const hasIV = (iv.q1 && iv.q1.trim()) || (iv.q2 && iv.q2.trim()) || (iv.q3 && iv.q3.trim());
  const vf = (e.salaryFactors || []).filter(f => f.name && f.name.trim() && f.desc && f.desc.trim());

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cn} 採用情報</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
/* ── DESIGN.md準拠：游ゴシック @font-face トリック（Windows対応） ── */
@font-face {
  font-family: AdjustedYuGothic;
  font-weight: 400;
  src: local("Yu Gothic Medium"), local("YuGothic-Medium");
}
@font-face {
  font-family: AdjustedYuGothic;
  font-weight: 700;
  src: local("Yu Gothic Bold"), local("YuGothic-Bold");
}

:root {
  /* Stone系ウォームグレー（SmartHR DESIGN.md準拠） */
  --text-black: #23221e;
  --text-grey: #706d65;
  --text-disabled: #c1bdb7;
  --stone-01: #f8f7f6;
  --stone-02: #edebe8;
  --stone-03: #aaa69f;
  --stone-04: #4e4c49;
  --white: #ffffff;
  --border: #d6d3d0;
  --surface: #f2f1f0;

  /* ブランドカラー */
  --navy: #1A2B4A;
  --blue: #1B6FBE;
  --blue-light: #3B8FD4;
  --blue-pale: #EBF4FF;
  --accent: #E8F1FB;

  /* タイポグラフィ（日本語DESIGN.md準拠） */
  --font-ja: AdjustedYuGothic, "Yu Gothic", YuGothic, "Hiragino Sans", "Noto Sans JP", sans-serif;
  --font-serif: "Noto Serif JP", "游明朝", YuMincho, serif;

  /* スペーシング（8pxスケール） */
  --sp-xs: 4px;
  --sp-s: 8px;
  --sp-m: 16px;
  --sp-l: 24px;
  --sp-xl: 32px;
  --sp-xxl: 40px;
  --sp-3xl: 64px;
  --sp-4xl: 96px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-ja);
  color: var(--text-black);
  background: var(--white);
  /* 日本語body: line-height 1.75、letter-spacing 0.05em */
  line-height: 1.75;
  letter-spacing: 0.03em;
  overflow-x: hidden;
  overflow-wrap: break-word; /* 禁則処理 */
  word-break: break-word;
}

/* ── ナビゲーション ── */
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-3xl);
}
.nav-brand {
  display: flex;
  flex-direction: column;
  text-decoration: none;
}
.nav-prefix {
  font-size: 10px;
  color: var(--text-grey);
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.nav-name {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.25; /* 見出し：1.25 */
  letter-spacing: 0;
}
.nav-links {
  display: flex;
  gap: var(--sp-xl);
  list-style: none;
}
.nav-links a {
  font-size: 13px;
  color: var(--text-grey);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--blue); }
.nav-cta {
  background: var(--blue);
  color: var(--white);
  padding: var(--sp-s) var(--sp-l);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: background 0.2s, transform 0.1s;
}
.nav-cta:hover { background: var(--navy); transform: translateY(-1px); }

/* ── ヒーロー ── */
.hero {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding-top: 64px;
}
.hero-left {
  background: var(--navy);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--sp-4xl) var(--sp-4xl);
  position: relative;
  overflow: hidden;
}
.hero-left::after {
  content: '';
  position: absolute;
  bottom: -80px; right: -80px;
  width: 360px; height: 360px;
  border-radius: 50%;
  background: rgba(59,143,212,0.08);
  pointer-events: none;
}
.hero-eyebrow {
  font-size: 10px;
  font-weight: 500;
  color: var(--blue-light);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: var(--sp-l);
}
.hero-prefix-text {
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  font-weight: 300;
  line-height: 1.25;
  letter-spacing: 0.05em;
  margin-bottom: var(--sp-xs);
}
.hero-name {
  font-family: var(--font-serif);
  font-size: clamp(28px, 3.5vw, 48px);
  color: var(--white);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
  margin-bottom: var(--sp-xl);
}
.hero-rule {
  width: 40px;
  height: 3px;
  background: var(--blue);
  margin-bottom: var(--sp-l);
}
.hero-mission {
  font-family: var(--font-serif);
  font-size: 17px;
  color: rgba(255,255,255,0.92);
  line-height: 1.75;
  letter-spacing: 0.02em;
  margin-bottom: var(--sp-m);
}
.hero-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  line-height: 1.75;
  letter-spacing: 0.03em;
  max-width: 400px;
}
.hero-right {
  position: relative;
  overflow: hidden;
  background: var(--stone-02);
}
.hero-right img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-right-empty {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--blue-pale) 0%, var(--stone-02) 100%);
}

/* ── セクション共通 ── */
section {
  padding: var(--sp-4xl) 0;
}
.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 var(--sp-3xl);
}
.section-eyebrow {
  font-size: 10px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: var(--sp-s);
  display: block;
}
.section-title {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.25;
  letter-spacing: 0;
  margin-bottom: var(--sp-m);
}
.section-lead {
  font-size: 15px;
  color: var(--text-grey);
  line-height: 1.75;
  letter-spacing: 0.03em;
  max-width: 520px;
}
.section-header {
  margin-bottom: var(--sp-3xl);
}

/* ── 会社概要 ── */
.overview { background: var(--stone-01); }
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4xl);
  align-items: start;
}
.overview-table { width: 100%; }
.overview-table tr { border-bottom: 1px solid var(--border); }
.overview-table td {
  padding: var(--sp-m) 0;
  font-size: 14px;
  vertical-align: top;
  line-height: 1.75;
  letter-spacing: 0.03em;
}
.overview-table td:first-child {
  color: var(--text-grey);
  width: 88px;
  font-size: 12px;
  letter-spacing: 0.05em;
}
.overview-table td:last-child {
  color: var(--text-black);
  font-weight: 500;
}
.overview-photo {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--stone-02);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.overview-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── 事業紹介 ── */
.biz-headline {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--navy);
  text-align: center;
  line-height: 1.5;
  letter-spacing: 0;
  margin-bottom: var(--sp-3xl);
  padding: var(--sp-xl) var(--sp-3xl);
  background: var(--blue-pale);
  border-radius: 8px;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-l);
  margin-bottom: var(--sp-4xl);
}
.service-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-top: 3px solid var(--blue);
  border-radius: 8px;
  padding: var(--sp-xl) var(--sp-l);
  transition: transform 0.2s, box-shadow 0.2s;
}
.service-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}
.service-num {
  font-size: 10px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: 0.15em;
  margin-bottom: var(--sp-s);
}
.service-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.5;
  letter-spacing: 0;
  margin-bottom: var(--sp-s);
}
.service-desc {
  font-size: 13px;
  color: var(--text-grey);
  line-height: 1.75;
  letter-spacing: 0.03em;
}
.biz-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4xl);
  align-items: center;
  margin-bottom: var(--sp-4xl);
  padding-bottom: var(--sp-4xl);
  border-bottom: 1px solid var(--border);
}
.biz-detail:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.biz-detail.reverse { direction: rtl; }
.biz-detail.reverse > * { direction: ltr; }
.biz-title {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.4;
  letter-spacing: 0;
  margin-bottom: var(--sp-m);
}
.biz-text {
  font-size: 14px;
  color: var(--text-grey);
  line-height: 1.85;
  letter-spacing: 0.03em;
}
.biz-photo {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--stone-02);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.biz-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── 報酬・評価 ── */
.compensation { background: var(--navy); }
.compensation .section-eyebrow { color: var(--blue-light); }
.compensation .section-title { color: var(--white); }
.comp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4xl);
  align-items: start;
}
.salary-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: var(--sp-3xl);
  text-align: center;
}
.salary-label {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.15em;
  margin-bottom: var(--sp-l);
  display: block;
}
.salary-amount {
  font-family: var(--font-serif);
  font-size: 52px;
  font-weight: 700;
  color: var(--white);
  line-height: 1;
  margin-bottom: var(--sp-s);
}
.salary-unit { font-size: 20px; color: rgba(255,255,255,0.65); }
.salary-note {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  margin-top: var(--sp-l);
  line-height: 1.75;
  letter-spacing: 0.03em;
}
.comp-right-title {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--white);
  line-height: 1.25;
  letter-spacing: 0;
  margin-bottom: var(--sp-l);
  padding-bottom: var(--sp-m);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.factor-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--sp-m);
  padding: var(--sp-m) 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 13px;
}
.factor-name {
  background: rgba(27,111,190,0.3);
  color: var(--blue-light);
  font-weight: 700;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-xs) var(--sp-s);
  font-size: 11px;
  letter-spacing: 0.03em;
  text-align: center;
}
.factor-desc {
  color: rgba(255,255,255,0.65);
  line-height: 1.75;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
}
.career-list { list-style: none; }
.career-item {
  display: flex;
  gap: var(--sp-m);
  padding: var(--sp-m) 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.career-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--blue-light);
  margin-top: 6px;
  flex-shrink: 0;
}
.career-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--white);
  line-height: 1.5;
  letter-spacing: 0;
}
.career-info {
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  margin-top: 2px;
  letter-spacing: 0.03em;
}
.career-sal {
  font-size: 13px;
  color: var(--blue-light);
  font-weight: 500;
  margin-top: 4px;
}

/* ── カルチャー ── */
.culture-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4xl);
  align-items: center;
}
.culture-tags {
  display: flex;
  gap: var(--sp-s);
  flex-wrap: wrap;
  margin-bottom: var(--sp-l);
}
.culture-tag {
  background: var(--blue);
  color: var(--white);
  padding: 5px var(--sp-m);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.culture-text {
  font-size: 14px;
  color: var(--text-grey);
  line-height: 1.85;
  letter-spacing: 0.03em;
}
.culture-photo {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--stone-02);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.culture-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── 求める人物像 ── */
.wanted { background: var(--stone-01); }
.wanted-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--sp-m);
}
.wanted-item {
  background: var(--white);
  border: 1px solid var(--border);
  border-left: 4px solid var(--blue);
  border-radius: 4px;
  padding: var(--sp-m) var(--sp-l);
  display: flex;
  align-items: center;
  gap: var(--sp-m);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-black);
  line-height: 1.5;
  letter-spacing: 0.03em;
}
.wanted-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--blue);
  min-width: 24px;
  letter-spacing: 0.05em;
}

/* ── 社員の声 ── */
.iv-card {
  background: var(--stone-01);
  border-radius: 8px;
  padding: var(--sp-3xl);
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--sp-3xl);
  align-items: start;
  border: 1px solid var(--border);
}
.iv-photo {
  width: 180px; height: 180px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--stone-02);
}
.iv-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.iv-person {
  font-size: 12px;
  color: var(--text-grey);
  text-align: center;
  margin-top: var(--sp-s);
  letter-spacing: 0.05em;
  line-height: 1.5;
}
.qa-item { margin-bottom: var(--sp-l); }
.qa-q {
  font-size: 14px;
  font-weight: 700;
  color: var(--blue);
  margin-bottom: var(--sp-s);
  display: flex;
  align-items: flex-start;
  gap: var(--sp-s);
  line-height: 1.5;
  letter-spacing: 0.03em;
}
.qa-badge {
  background: var(--blue);
  color: var(--white);
  width: 20px; height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}
.qa-a {
  font-size: 14px;
  color: var(--text-grey);
  line-height: 1.85;
  letter-spacing: 0.03em;
  padding-left: 28px;
}

/* ── 働き方 ── */
.workstyle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3xl);
}
.ws-item h3 {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: var(--sp-m);
  padding-bottom: var(--sp-s);
  border-bottom: 2px solid var(--blue);
  line-height: 1.25;
  letter-spacing: 0;
  display: inline-block;
}
.ws-item p {
  font-size: 14px;
  color: var(--text-grey);
  line-height: 1.85;
  letter-spacing: 0.03em;
}
.benefits-wrap {
  margin-top: var(--sp-3xl);
  padding-top: var(--sp-3xl);
  border-top: 1px solid var(--border);
}
.benefits-wrap h3 {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: var(--sp-l);
  line-height: 1.25;
  letter-spacing: 0;
}
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--sp-s);
}
.benefit-item {
  background: var(--blue-pale);
  border-radius: 4px;
  padding: var(--sp-s) var(--sp-m);
  font-size: 13px;
  color: var(--navy);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--sp-s);
  line-height: 1.5;
  letter-spacing: 0.03em;
}
.benefit-item::before {
  content: '✓';
  color: var(--blue);
  font-weight: 700;
  flex-shrink: 0;
}

/* ── CTA ── */
.cta {
  background: var(--navy);
  text-align: center;
  padding: var(--sp-4xl) var(--sp-3xl);
}
.cta h2 {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 700;
  color: var(--white);
  line-height: 1.5;
  letter-spacing: 0;
  margin-bottom: var(--sp-m);
}
.cta p {
  font-size: 15px;
  color: rgba(255,255,255,0.55);
  margin-bottom: var(--sp-3xl);
  line-height: 1.75;
  letter-spacing: 0.03em;
}
.cta-btn {
  display: inline-block;
  background: var(--blue);
  color: var(--white);
  padding: var(--sp-m) var(--sp-3xl);
  border-radius: 6px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: background 0.2s, transform 0.15s;
}
.cta-btn:hover { background: var(--blue-light); transform: translateY(-2px); }

/* ── フッター ── */
footer {
  background: var(--text-black);
  color: var(--stone-03);
  text-align: center;
  padding: var(--sp-l);
  font-size: 12px;
  letter-spacing: 0.05em;
  line-height: 1.5;
}

/* ── アニメーション ── */
.fade-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.65s ease, transform 0.65s ease;
}
.fade-up.visible { opacity: 1; transform: translateY(0); }
.fade-up.delay-1 { transition-delay: 0.1s; }
.fade-up.delay-2 { transition-delay: 0.2s; }
.fade-up.delay-3 { transition-delay: 0.3s; }

/* ── レスポンシブ ── */
@media (max-width: 768px) {
  nav { padding: 0 var(--sp-l); }
  .nav-links, .nav-cta { display: none; }
  .hero { grid-template-columns: 1fr; }
  .hero-left { padding: var(--sp-3xl) var(--sp-l); min-height: 65vh; }
  .hero-right { min-height: 40vw; }
  .container { padding: 0 var(--sp-l); }
  section { padding: var(--sp-3xl) 0; }
  .overview-grid, .biz-detail, .comp-grid, .culture-grid, .workstyle-grid, .iv-card { grid-template-columns: 1fr; gap: var(--sp-l); }
  .biz-detail.reverse { direction: ltr; }
  .section-title { font-size: 24px; }
  .salary-amount { font-size: 40px; }
}
</style>
</head>
<body>

<!-- ナビ -->
<nav>
  <a href="#" class="nav-brand">
    ${prefix ? `<span class="nav-prefix">${prefix}</span>` : ''}
    <span class="nav-name">${shortName}</span>
  </a>
  <ul class="nav-links">
    <li><a href="#overview">会社概要</a></li>
    <li><a href="#business">事業紹介</a></li>
    ${sMin || vc.length ? `<li><a href="#compensation">待遇</a></li>` : ''}
    <li><a href="#culture">カルチャー</a></li>
    <li><a href="#workstyle">働き方</a></li>
  </ul>
  <a href="#cta" class="nav-cta">応募する</a>
</nav>

<!-- ヒーロー -->
<div class="hero">
  <div class="hero-left">
    <span class="hero-eyebrow">Recruitment</span>
    ${prefix ? `<p class="hero-prefix-text">${prefix}</p>` : ''}
    <h1 class="hero-name">${shortName}</h1>
    <div class="hero-rule"></div>
    ${e.mission ? `<p class="hero-mission">${e.mission}</p>` : ''}
    ${e.missionDesc ? `<p class="hero-desc">${e.missionDesc.slice(0, 100)}...</p>` : ''}
  </div>
  <div class="hero-right">
    ${e.photos && e.photos.cover
      ? `<img src="${e.photos.cover}" alt="${cn}のカバー写真">`
      : `<div class="hero-right-empty"></div>`}
  </div>
</div>

<!-- 会社概要 -->
<section class="overview" id="overview">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Company</span>
      <h2 class="section-title fade-up delay-1">会社概要</h2>
    </div>
    <div class="overview-grid">
      <table class="overview-table fade-up">
        <tbody>
          ${[
            ['社名', e.companyName],
            ['所在地', e.address],
            ['代表者', e.ceo],
            ['設立', e.founded],
            ['従業員数', e.employees],
            ['売上高', e.sales],
            ['事業内容', e.business],
          ].filter(([,v]) => v && v.trim()).map(([k,v]) =>
            `<tr><td>${k}</td><td>${v}</td></tr>`
          ).join('')}
        </tbody>
      </table>
      <div class="overview-photo fade-up delay-1">
        ${e.photos && e.photos.company
          ? `<img src="${e.photos.company}" alt="${cn}の写真">`
          : `<div style="width:100%;height:100%;background:var(--stone-02);display:flex;align-items:center;justify-content:center;color:var(--stone-03);font-size:13px;letter-spacing:0.05em;">会社・施設写真</div>`}
      </div>
    </div>
  </div>
</section>

<!-- 事業紹介 -->
<section id="business">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Business</span>
      <h2 class="section-title fade-up delay-1">事業紹介</h2>
    </div>
    ${e.bizHeadline ? `<div class="biz-headline fade-up">${e.bizHeadline}</div>` : ''}
    ${services.length > 0 ? `
    <div class="services-grid">
      ${services.map((s, i) => `
      <div class="service-card fade-up" style="transition-delay:${i*0.08}s">
        <p class="service-num">SERVICE ${String(i+1).padStart(2,'0')}</p>
        <h3 class="service-title">${s.title}</h3>
        <p class="service-desc">${s.desc}</p>
      </div>`).join('')}
    </div>` : ''}
    ${e.biz1Title && e.biz1Body ? `
    <div class="biz-detail fade-up">
      <div>
        <h3 class="biz-title">${e.biz1Title}</h3>
        <p class="biz-text">${e.biz1Body}</p>
      </div>
      <div class="biz-photo">
        ${e.photos && e.photos.biz1
          ? `<img src="${e.photos.biz1}" alt="${e.biz1Title}">`
          : `<div style="width:100%;height:100%;background:var(--stone-02);"></div>`}
      </div>
    </div>` : ''}
    ${e.biz2Title && e.biz2Body ? `
    <div class="biz-detail reverse fade-up">
      <div>
        <h3 class="biz-title">${e.biz2Title}</h3>
        <p class="biz-text">${e.biz2Body}</p>
      </div>
      <div class="biz-photo">
        ${e.photos && e.photos.biz2
          ? `<img src="${e.photos.biz2}" alt="${e.biz2Title}">`
          : `<div style="width:100%;height:100%;background:var(--stone-02);"></div>`}
      </div>
    </div>` : ''}
  </div>
</section>

<!-- 報酬・評価 -->
${(sMin && sMax) || vf.length >= 1 || vc.length >= 1 ? `
<section class="compensation" id="compensation">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Compensation</span>
      <h2 class="section-title fade-up delay-1">評価・報酬制度</h2>
    </div>
    <div class="comp-grid">
      ${sMin && sMax ? `
      <div class="salary-card fade-up">
        <span class="salary-label">${stl}</span>
        <div class="salary-amount">${sMin}<span style="font-size:28px">〜</span>${sMax}</div>
        <div class="salary-unit">${sUnit}</div>
        <p class="salary-note">${e.salaryNote || '賞与・昇給あり'}<br>※詳細は面接時にご確認ください</p>
      </div>` : '<div></div>'}
      <div class="fade-up delay-1">
        ${vf.length >= 1 ? `
        <p class="comp-right-title">報酬の考え方</p>
        ${vf.slice(0,3).map(f => `
        <div class="factor-item">
          <div class="factor-name">${f.name}</div>
          <div class="factor-desc">${f.desc}</div>
        </div>`).join('')}` : ''}
        ${vc.length >= 1 ? `
        <p class="comp-right-title" style="margin-top:${vf.length ? '32px' : '0'}">キャリアパス</p>
        <ul class="career-list">
          ${vc.map(s => `
          <li class="career-item">
            <div class="career-dot"></div>
            <div>
              <div class="career-name">${s.title}</div>
              ${s.desc ? `<div class="career-info">${s.desc}</div>` : ''}
              ${s.salary ? `<div class="career-sal">${/^\d+$/.test(s.salary.trim()) ? s.salary + '万円' : s.salary}</div>` : ''}
            </div>
          </li>`).join('')}
        </ul>` : ''}
      </div>
    </div>
  </div>
</section>` : ''}

<!-- カルチャー -->
<section id="culture">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Culture</span>
      <h2 class="section-title fade-up delay-1">カルチャー</h2>
    </div>
    <div class="culture-grid">
      <div class="fade-up">
        ${(e.cultureVal1 || e.cultureVal2) ? `
        <div class="culture-tags">
          ${e.cultureVal1 ? `<span class="culture-tag">${e.cultureVal1}</span>` : ''}
          ${e.cultureVal2 ? `<span class="culture-tag">${e.cultureVal2}</span>` : ''}
        </div>` : ''}
        ${e.cultureDesc ? `<p class="culture-text">${e.cultureDesc}</p>` : ''}
      </div>
      <div class="culture-photo fade-up delay-1">
        ${e.photos && e.photos.culture
          ? `<img src="${e.photos.culture}" alt="カルチャー写真">`
          : `<div style="width:100%;height:100%;background:var(--stone-02);"></div>`}
      </div>
    </div>
  </div>
</section>

<!-- 求める人物像 -->
${wantedList.length > 0 ? `
<section class="wanted" id="wanted">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Who We Need</span>
      <h2 class="section-title fade-up delay-1">こんな方と働きたい</h2>
    </div>
    <div class="wanted-grid">
      ${wantedList.map((v, i) => `
      <div class="wanted-item fade-up" style="transition-delay:${i*0.06}s">
        <span class="wanted-num">${String(i+1).padStart(2,'0')}</span>${v}
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

<!-- 社員の声 -->
${hasIV ? `
<section id="interview">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Voice</span>
      <h2 class="section-title fade-up delay-1">社員の声</h2>
    </div>
    <div class="iv-card fade-up">
      <div>
        <div class="iv-photo">
          ${e.photos && e.photos.member
            ? `<img src="${e.photos.member}" alt="${iv.person || '社員'}の写真">`
            : `<div style="width:100%;height:100%;background:var(--stone-02);"></div>`}
        </div>
        ${iv.person ? `<p class="iv-person">${iv.person}</p>` : ''}
      </div>
      <div>
        ${[[iv.q1,iv.a1],[iv.q2,iv.a2],[iv.q3,iv.a3]].filter(([q])=>q&&q.trim()).map(([q,a])=>`
        <div class="qa-item">
          <div class="qa-q"><span class="qa-badge">Q</span>${q}</div>
          <p class="qa-a">${a||''}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>` : ''}

<!-- 働き方 -->
<section id="workstyle">
  <div class="container">
    <div class="section-header">
      <span class="section-eyebrow fade-up">Work Style</span>
      <h2 class="section-title fade-up delay-1">働き方・制度</h2>
    </div>
    <div class="workstyle-grid">
      ${[
        ['就業時間', e.workHours],
        ['勤務地', e.workLocation],
        ['休暇・休日', holidays.join('　')],
      ].filter(([,v])=>v&&v.trim()).map(([k,v],i)=>`
      <div class="ws-item fade-up" style="transition-delay:${i*0.1}s">
        <h3>${k}</h3>
        <p>${v}</p>
      </div>`).join('')}
    </div>
    ${benefits.length > 0 ? `
    <div class="benefits-wrap fade-up">
      <h3>福利厚生</h3>
      <div class="benefits-grid">
        ${benefits.map(b=>`<div class="benefit-item">${b}</div>`).join('')}
      </div>
    </div>` : ''}
  </div>
</section>

<!-- CTA -->
<section class="cta" id="cta">
  <h2 class="fade-up">${cn}で、<br>一緒に働きませんか？</h2>
  <p class="fade-up delay-1">まずはカジュアルにお話しましょう。</p>
  <a href="${e.hpUrl||'#'}" target="_blank" class="cta-btn fade-up delay-2">採用ページを見る</a>
</section>

<footer>
  <p>© ${cn} All Rights Reserved. | 採用ピッチ資料ジェネレーター にて作成</p>
</footer>

<script>
// スクロールフェードイン
const obs = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    e.preventDefault();
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
</script>
</body>
</html>`;

  return res.status(200).json({ html });
};
