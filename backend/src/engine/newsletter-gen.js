/**
 * Newsletter Generator — creates a Morning Brew-style HTML newsletter
 * from selected articles using Claude.
 */

import { complete, isAvailable } from '../lib/ai-client.js';

/**
 * Generate a newsletter from articles and config.
 * @param {{ articles: object[], config: object[], title: string }}
 * @returns {{ title: string, html: string }}
 */
export async function generateNewsletter({ articles, config, title }) {
  // Group articles by sector
  const bySector = {};
  for (const a of articles) {
    const sector = a.sector || 'general';
    if (!bySector[sector]) bySector[sector] = [];
    bySector[sector].push(a);
  }

  // Build section content
  const sections = config.map(section => {
    const sectorArticles = section.sector_keys
      .flatMap(key => bySector[key] || []);
    if (sectorArticles.length === 0) return null;

    return {
      title: section.practice_area,
      articles: sectorArticles,
    };
  }).filter(Boolean);

  // Add uncategorised articles
  const categorised = new Set(sections.flatMap(s => s.articles.map(a => a.id)));
  const uncategorised = articles.filter(a => !categorised.has(a.id));
  if (uncategorised.length > 0) {
    sections.push({ title: 'Other News', articles: uncategorised });
  }

  // If AI is available, use Claude to write editorial summaries
  let htmlBody = '';
  if (isAvailable()) {
    htmlBody = await generateWithAI(sections, title);
  } else {
    htmlBody = generateFallback(sections, title);
  }

  const html = wrapInTemplate(title, htmlBody);
  return { title, html };
}

async function generateWithAI(sections, title) {
  const sectionText = sections.map(s => {
    const items = s.articles.map(a =>
      `- "${a.headline}" (${a.source_name}) — ${a.summary || 'No summary available'}`
    ).join('\n');
    return `## ${s.title}\n${items}`;
  }).join('\n\n');

  const prompt = `Write a professional energy industry briefing newsletter in HTML format.

Title: ${title}

Here are the articles grouped by section:

${sectionText}

Requirements:
- Write in a concise, professional style suitable for energy lawyers and consultants
- Do NOT include the newsletter title — it's already rendered in the masthead above your content
- For each section, use an <h2> heading (the section name), then a 2-3 sentence editorial overview in a <p>, then list each article as a bullet with a one-line takeaway
- Include source attribution inline as <em>(Source Name)</em>
- Link article headlines to their URLs where available using <a href="..." target="_blank">
- Use clean, semantic HTML (h2, p, ul, li, a, strong, em tags only)
- Do NOT include <html>, <head>, <body>, or <h1> tags — just section-level inner content
- Keep it scannable — busy professionals should get the key points in 60 seconds`;

  const response = await complete({
    system: 'You are a senior energy intelligence editor writing a weekly briefing for law firm partners and energy consultants. Write clearly, concisely, and professionally.',
    user: prompt,
    maxTokens: 4000,
    temperature: 0.4,
  });

  return response || generateFallback(sections, title);
}

function generateFallback(sections, title) {
  let html = '';

  for (const section of sections) {
    html += `<h2>${escapeHtml(section.title)}</h2>\n<ul>\n`;
    for (const a of section.articles) {
      const link = a.url
        ? `<a href="${escapeHtml(a.url)}" target="_blank">${escapeHtml(a.headline)}</a>`
        : escapeHtml(a.headline);
      html += `  <li><strong>${link}</strong>`;
      if (a.source_name) html += ` <em>(${escapeHtml(a.source_name)})</em>`;
      if (a.summary) html += `<br>${escapeHtml(a.summary)}`;
      html += `</li>\n`;
    }
    html += `</ul>\n`;
  }

  return html;
}

function wrapInTemplate(title, body) {
  const dateline = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  html, body { background-color: #ffffff !important; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 40px 28px; color: #1a1a1a; line-height: 1.7; background-color: #ffffff; }
  .masthead { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 28px; }
  .masthead .eyebrow { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8B6914; font-weight: 600; margin: 0 0 6px; }
  .masthead h1 { font-size: 30px; line-height: 1.15; color: #1a1a1a; margin: 0 0 8px; font-weight: 700; border: none; padding: 0; }
  .masthead .dateline { font-size: 12px; color: #888; font-style: italic; margin: 0; }
  h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 24px; }
  h2 { font-size: 20px; color: #1a1a1a; margin-top: 36px; margin-bottom: 14px; border-left: 4px solid #C9B99A; padding-left: 14px; font-weight: 600; }
  h3 { font-size: 16px; color: #1a1a1a; margin-top: 20px; margin-bottom: 8px; font-weight: 600; }
  p { color: #333; margin: 0 0 14px; }
  ul { padding-left: 20px; margin: 0 0 16px; }
  li { margin-bottom: 14px; color: #333; }
  li strong, li a { color: #1a1a1a; }
  a { color: #8B6914; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
  em { color: #777; font-size: 0.9em; font-style: italic; }
  .footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
  .footer p { color: #999; margin: 0; }
</style>
</head>
<body>
<div class="masthead">
  <p class="eyebrow">E&amp;I Brief &middot; Weekly Briefing</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="dateline">${dateline}</p>
</div>
${body}
<div class="footer">
  <p>Generated by E&amp;I Brief &mdash; ${dateline}</p>
</div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
