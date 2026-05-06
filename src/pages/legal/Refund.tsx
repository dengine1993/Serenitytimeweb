import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { RefundContent, RefundMeta } from "@/components/legal/content/RefundContent";

const ROUTES = { offer: "/offer", disclaimer: "/disclaimer", privacy: "/privacy", refund: "/refund", seller: "/seller" } as const;

export default function Refund() {
  return (
    <LegalPageLayout
      title={RefundMeta.title}
      lastUpdated={RefundMeta.lastUpdated}
      description={RefundMeta.description}
    >
      <RefundContent renderLink={(target, label) => (
        <Link to={ROUTES[target]} className="text-primary underline hover:text-primary/80">{label}</Link>
      )} />
    </LegalPageLayout>
  );
}
