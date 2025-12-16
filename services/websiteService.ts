import { WebsitePage } from '../types';
import { supabase } from './supabaseClient';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const slugifyPageSlug = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .replace(/-{2,}/g, '-');
  return sanitized || 'page';
};

export const buildStaticHtml = (page: WebsitePage): string => {
  const { content, seoMetadata } = page;
  const keywords = seoMetadata?.keywords?.filter(Boolean).join(', ');
  const title = seoMetadata?.title || page.title;
  const description = seoMetadata?.description || content?.subheadline || '';
  const headline = content?.headline || page.title;
  const subheadline = content?.subheadline || '';
  const features = content?.features || [];
  const ctaText = content?.ctaText || 'Get Started';
  const brandColor = content?.brandColor || '#0f172a';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : ''}
  ${seoMetadata?.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(seoMetadata.canonicalUrl)}" />` : ''}
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${seoMetadata?.ogImage ? `<meta property="og:image" content="${escapeHtml(seoMetadata.ogImage)}" />` : ''}
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
    .hero { padding: 80px 24px; text-align: center; background: linear-gradient(180deg, ${brandColor} 0%, #0b1224 100%); color: white; }
    .hero h1 { font-size: 48px; margin: 0 0 16px; }
    .hero p { font-size: 18px; opacity: 0.9; margin: 0 auto 24px; max-width: 760px; }
    .cta { display: inline-flex; align-items: center; gap: 8px; background: white; color: ${brandColor}; padding: 14px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; box-shadow: 0 12px 30px rgba(0,0,0,0.12); }
    .features { max-width: 1040px; margin: -40px auto 48px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); padding: 0 16px; }
    .card { background: white; border-radius: 14px; padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .footer { padding: 24px; text-align: center; color: #475569; font-size: 14px; }
  </style>
</head>
<body>
  <section class="hero">
    <h1>${escapeHtml(headline)}</h1>
    <p>${escapeHtml(subheadline)}</p>
    <a class="cta" href="#contact">${escapeHtml(ctaText)}</a>
  </section>
  <section class="features">
    ${features
      .map(
        (feature) =>
          `<div class="card"><h3>${escapeHtml(feature)}</h3><p>High-impact benefit that drives conversions.</p></div>`
      )
      .join('\n')}
  </section>
  <div class="footer">Powered by BuildMyBot • Embed your AI assistant by dropping the provided snippet into the <head>.</div>
</body>
</html>`;
};

export const uploadPageToStorage = async (page: WebsitePage, html: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('You must be logged in to publish.');

  const slug = page.slug || slugifyPageSlug(page.title);
  const path = `${userId}/${slug}.html`;

  const uploadResult = await supabase.storage
    .from('website-exports')
    .upload(path, html, { contentType: 'text/html', upsert: true });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const { data } = supabase.storage.from('website-exports').getPublicUrl(path);
  return data.publicUrl;
};

export const createFirebaseStaticExport = (page: WebsitePage, html: string) => {
  const blob = new Blob([html], { type: 'text/html' });
  const slug = page.slug || slugifyPageSlug(page.title);
  const fileName = `${slug}.html`;
  const url = URL.createObjectURL(blob);

  return { url, fileName };
};
