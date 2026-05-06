import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { ConsentContent, ConsentMeta } from "@/components/legal/content/ConsentContent";

const ROUTES = {
  offer: "/offer",
  disclaimer: "/disclaimer",
  privacy: "/privacy",
  refund: "/refund",
  seller: "/seller",
  consent: "/consent",
  cookies: "/cookies",
} as const;

export default function Consent() {
  return (
    <LegalPageLayout
      title={ConsentMeta.title}
      lastUpdated={ConsentMeta.lastUpdated}
      description={ConsentMeta.description}
    >
      <ConsentContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
