import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { OfferContent, OfferMeta } from "@/components/legal/content/OfferContent";

const ROUTES = { offer: "/offer", disclaimer: "/disclaimer", privacy: "/privacy", refund: "/refund", seller: "/seller" } as const;

export default function Offer() {
  return (
    <LegalPageLayout
      title={OfferMeta.title}
      lastUpdated={OfferMeta.lastUpdated}
      description={OfferMeta.description}
    >
      <OfferContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
