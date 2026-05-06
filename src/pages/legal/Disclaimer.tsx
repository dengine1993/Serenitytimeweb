import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { DisclaimerContent, DisclaimerMeta } from "@/components/legal/content/DisclaimerContent";

const ROUTES = { offer: "/offer", disclaimer: "/disclaimer", privacy: "/privacy", refund: "/refund", seller: "/seller" } as const;

export default function Disclaimer() {
  return (
    <LegalPageLayout
      title={DisclaimerMeta.title}
      lastUpdated={DisclaimerMeta.lastUpdated}
      description={DisclaimerMeta.description}
    >
      <DisclaimerContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
