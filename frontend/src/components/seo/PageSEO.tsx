import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://lifecare.plus';

interface PageSEOProps {
  titleKey: string;
  descriptionKey: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export function PageSEO({ titleKey, descriptionKey, path = '', image, noIndex }: PageSEOProps) {
  const { t } = useTranslation();
  const title = t(titleKey);
  const description = t(descriptionKey);
  const url = `${SITE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image || `${SITE_URL.replace(/\/$/, '')}/og-image.svg`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={t('seo.siteName')} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={document.documentElement.lang === 'hi' ? 'hi_IN' : 'en_IN'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
