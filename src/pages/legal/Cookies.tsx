import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { CookiesContent, CookiesMeta } from "@/components/legal/content/CookiesContent";

const ROUTES = {
  offer: "/offer",
  disclaimer: "/disclaimer",
  privacy: "/privacy",
  refund: "/refund",
  seller: "/seller",
  consent: "/consent",
  cookies: "/cookies",
} as const;

export default function Cookies() {
  return (
    <LegalPageLayout
      title={CookiesMeta.title}
      lastUpdated={CookiesMeta.lastUpdated}
      description={CookiesMeta.description}
    >
      <CookiesContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
