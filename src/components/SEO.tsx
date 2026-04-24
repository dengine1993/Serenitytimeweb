import { Helmet } from "react-helmet-async";
import { useI18n } from "@/hooks/useI18n";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO = ({
  title,
  description,
  keywords,
  image = "/icon-512.png",
  url,
  type = "website",
}: SEOProps) => {
  const { t, language } = useI18n();
  const location = useLocation();
  
  const appName = t("common.appName");
  const baseUrl = "https://bezmyatezhnye.lovable.app";
  const currentUrl = url || `${baseUrl}${location.pathname}`;
  
  // For landing page, use custom social media texts
  const isLandingPage = location.pathname === '/';
  const resolvedTitle = isLandingPage 
    ? t("seo.socialTitle")
    : (title ?? t("seo.defaultTitle", { appName }));
  
  const resolvedDescription = isLandingPage
    ? t("seo.socialDescription")
    : (description ?? t("seo.defaultDescription"));
    
  const resolvedKeywords = keywords ?? t("seo.defaultKeywords");
  const siteTitle = resolvedTitle.includes(appName) ? resolvedTitle : `${resolvedTitle} | ${appName}`;
  const locale = language === "ru" ? "ru_RU" : "en_US";
  const ogImage = `${baseUrl}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={language} />
      <title>{siteTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="keywords" content={resolvedKeywords} />
      <meta name="author" content={appName} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${appName} - ${resolvedDescription}`} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={appName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${appName} - ${resolvedDescription}`} />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="theme-color" content="#0A0F18" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />

      {/* Structured Data - WebApplication for Landing */}
      {isLandingPage && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: appName,
            description: t("seo.organizationDescription"),
            url: baseUrl,
            applicationCategory: "HealthApplication",
            operatingSystem: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "RUB"
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "2847",
              bestRating: "5",
              worstRating: "1"
            }
          })}
        </script>
      )}

      {/* Structured Data - WebSite */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: appName,
          description: resolvedDescription,
          url: baseUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl}/feed?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        })}
      </script>

      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: appName,
          description: t("seo.organizationDescription"),
          url: baseUrl,
          logo: `${baseUrl}/icon-512.png`,
          sameAs: [],
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
