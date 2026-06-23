import { AskFullPage } from "@/components/AskFullPage";
import { listProductsInDomain } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; domain?: string }>;
}) {
  const params = await searchParams;
  const domain = params.domain ?? "cosmetics";
  const products = await listProductsInDomain(domain);
  return (
    <AskFullPage
      domain={domain}
      initialProduct={params.product ?? null}
      products={products}
    />
  );
}
