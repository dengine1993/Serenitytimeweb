import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SellerInfoContent, SellerInfoMeta } from "@/components/legal/content/SellerInfoContent";

export default function SellerInfo() {
  return (
    <LegalPageLayout
      title={SellerInfoMeta.title}
      lastUpdated={SellerInfoMeta.lastUpdated}
      description={SellerInfoMeta.description}
    >
      <SellerInfoContent />
    </LegalPageLayout>
  );
}
