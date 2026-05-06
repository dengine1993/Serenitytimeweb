import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PrivacyContent, PrivacyMeta } from "@/components/legal/content/PrivacyContent";

const ROUTES = { offer: "/offer", disclaimer: "/disclaimer", privacy: "/privacy", refund: "/refund", seller: "/seller", consent: "/consent", cookies: "/cookies" } as const;

export default function Privacy() {
  return (
    <LegalPageLayout
      title={PrivacyMeta.title}
      lastUpdated={PrivacyMeta.lastUpdated}
      description={PrivacyMeta.description}
    >
      <PrivacyContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
