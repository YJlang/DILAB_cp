/**
 * Server-side data fetchers — Supabase REST 로 S1 화면 데이터 모음.
 * RLS 가 public 도메인은 anon 으로 read 허용하므로 anon key 로 호출 OK.
 */
import { supabase } from "./supabase";
import type {
  Chunk,
  Document,
  Domain,
  JourneyAssignment,
  Product,
  Rating,
  Sentiment,
  Topic,
} from "./types";

export async function getDomain(slug: string): Promise<Domain> {
  const { data, error } = await supabase
    .from("domains")
    .select("id, slug, name, categories, rating_axes, journey_stages")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as Domain;
}

export async function listProductsInDomain(
  domainSlug: string
): Promise<Array<{ slug: string; name: string; brand: string | null }>> {
  const domain = await getDomain(domainSlug);
  const { data, error } = await supabase
    .from("products")
    .select("name, brand, metadata")
    .eq("domain_id", domain.id);
  if (error) throw error;
  return (data ?? [])
    .map((p) => {
      const meta = (p.metadata as { slug?: string } | null) ?? {};
      return {
        slug: meta.slug ?? "",
        name: p.name as string,
        brand: (p.brand as string | null) ?? null,
      };
    })
    .filter((p) => p.slug);
}

export async function getProductBySlug(
  domainId: string,
  productSlug: string
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select("id, domain_id, name, brand, category, metadata")
    .eq("domain_id", domainId);
  if (error) throw error;
  const found = (data ?? []).find(
    (p) => (p.metadata as { slug?: string } | null)?.slug === productSlug
  );
  if (!found) throw new Error(`product not found: ${productSlug}`);
  return found as Product;
}

export async function getRatings(productId: string): Promise<Rating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("product_id", productId);
  if (error) throw error;
  return (data ?? []) as Rating[];
}

export async function getChunks(chunkIds: string[]): Promise<Chunk[]> {
  if (chunkIds.length === 0) return [];
  const { data, error } = await supabase
    .from("chunks")
    .select("id, text, document_id")
    .in("id", chunkIds);
  if (error) throw error;
  return (data ?? []) as Chunk[];
}

export async function getDocumentsByProduct(
  productId: string
): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, source_type, author, author_credibility, source_url, title")
    .eq("product_id", productId);
  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getSentimentsForProduct(
  productId: string
): Promise<Sentiment[]> {
  // documents → chunks → sentiments join
  const docs = await getDocumentsByProduct(productId);
  if (docs.length === 0) return [];
  const docIds = docs.map((d) => d.id);
  const { data: chunkRows, error: chunkErr } = await supabase
    .from("chunks")
    .select("id")
    .in("document_id", docIds);
  if (chunkErr) throw chunkErr;
  const chunkIds = (chunkRows ?? []).map((c) => c.id);
  if (chunkIds.length === 0) return [];
  const { data, error } = await supabase
    .from("sentiments")
    .select("chunk_id, sentiment, intensity")
    .in("chunk_id", chunkIds);
  if (error) throw error;
  return (data ?? []) as Sentiment[];
}

export async function getTopics(domainId: string): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, topic_index, label, keywords, doc_count")
    .eq("domain_id", domainId)
    .neq("topic_index", -1)
    .order("doc_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Topic[];
}

export async function getJourney(
  productId: string
): Promise<JourneyAssignment[]> {
  const { data, error } = await supabase
    .from("journey_assignments")
    .select("chunk_id, product_id, stage_key, confidence, is_estimated")
    .eq("product_id", productId);
  if (error) throw error;
  return (data ?? []) as JourneyAssignment[];
}

export type TopicWithChunks = {
  id: string;
  topic_index: number;
  label: string;
  keywords: string[];
  doc_count: number;
  chunks: Array<{
    chunk_id: string;
    text: string;
    author: string | null;
    source_type: string;
    sentiment: string;
  }>;
  sentiment: { positive: number; neutral: number; negative: number };
};

export async function getTopicsWithChunks(
  domainSlug: string
): Promise<TopicWithChunks[]> {
  const domain = await getDomain(domainSlug);
  const { data: topics } = await supabase
    .from("topics")
    .select("id, label, keywords, doc_count, topic_index")
    .eq("domain_id", domain.id)
    .neq("topic_index", -1)
    .order("doc_count", { ascending: false });
  if (!topics || topics.length === 0) return [];

  const result = await Promise.all(
    topics.map(async (t) => {
      const { data: ta } = await supabase
        .from("topic_assignments")
        .select("chunk_id")
        .eq("topic_id", t.id as string);
      const chunkIds = (ta ?? []).map((x) => x.chunk_id as string);
      let detail: TopicWithChunks["chunks"] = [];
      const sentCounts = { positive: 0, neutral: 0, negative: 0 };
      if (chunkIds.length > 0) {
        const [cRes, sRes] = await Promise.all([
          supabase
            .from("chunks")
            .select("id, text, document_id")
            .in("id", chunkIds),
          supabase
            .from("sentiments")
            .select("chunk_id, sentiment")
            .in("chunk_id", chunkIds),
        ]);
        const chunks = cRes.data ?? [];
        const docIds = Array.from(
          new Set(chunks.map((c) => c.document_id as string))
        );
        const { data: docs } = await supabase
          .from("documents")
          .select("id, author, source_type")
          .in("id", docIds);
        const docMap = Object.fromEntries(
          (docs ?? []).map((d) => [d.id as string, d])
        );
        const sentMap = Object.fromEntries(
          (sRes.data ?? []).map((s) => [
            s.chunk_id as string,
            s.sentiment as string,
          ])
        );
        detail = chunks.map((c) => {
          const d = docMap[c.document_id as string];
          return {
            chunk_id: c.id as string,
            text: c.text as string,
            author: (d?.author as string | null) ?? null,
            source_type: (d?.source_type as string) ?? "unknown",
            sentiment: sentMap[c.id as string] ?? "unknown",
          };
        });
        for (const d of detail) {
          if (d.sentiment in sentCounts) {
            sentCounts[d.sentiment as "positive" | "neutral" | "negative"]++;
          }
        }
      }
      return {
        id: t.id as string,
        topic_index: t.topic_index as number,
        label: t.label as string,
        keywords: (t.keywords as string[]) ?? [],
        doc_count: (t.doc_count as number) ?? 0,
        chunks: detail.slice(0, 8),
        sentiment: sentCounts,
      };
    })
  );
  return result;
}

export type DomainProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  avg_score: number;
  ratings: Record<string, number>;
};

export type DomainStats = {
  domain: Domain;
  products: DomainProductSummary[];
  counts: {
    products: number;
    documents: number;
    chunks: number;
    topics: number;
    ask_queries: number;
  };
  topics: Array<{ label: string; keywords: string[]; doc_count: number }>;
  sentiment_dist: { positive: number; neutral: number; negative: number };
};

export async function getDomainStats(domainSlug: string): Promise<DomainStats> {
  const domain = await getDomain(domainSlug);

  const [pRes, dRes, cRes, tRes, qRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, metadata")
      .eq("domain_id", domain.id),
    supabase
      .from("documents")
      .select("id, source_type")
      .eq("domain_id", domain.id),
    supabase.from("chunks").select("id").eq("domain_id", domain.id),
    supabase
      .from("topics")
      .select("label, keywords, doc_count, topic_index")
      .eq("domain_id", domain.id)
      .neq("topic_index", -1)
      .order("doc_count", { ascending: false }),
    supabase.from("ask_queries").select("id").eq("domain_id", domain.id),
  ]);

  const products = pRes.data ?? [];
  const chunks = cRes.data ?? [];
  const chunkIds = chunks.map((c) => c.id as string);
  const productIds = products.map((p) => p.id as string);

  const [sRes, rRes] = await Promise.all([
    chunkIds.length > 0
      ? supabase
          .from("sentiments")
          .select("sentiment")
          .in("chunk_id", chunkIds)
      : Promise.resolve({ data: [] as { sentiment: string }[] }),
    productIds.length > 0
      ? supabase
          .from("ratings")
          .select("product_id, axis, score")
          .in("product_id", productIds)
      : Promise.resolve({
          data: [] as { product_id: string; axis: string; score: number }[],
        }),
  ]);

  // 제품별 점수 집계
  const ratingsByProduct: Record<string, Record<string, number>> = {};
  for (const r of rRes.data ?? []) {
    const pid = r.product_id as string;
    (ratingsByProduct[pid] ??= {})[r.axis as string] = Number(r.score);
  }
  const productSummary: DomainProductSummary[] = products.map((p) => {
    const ratings = ratingsByProduct[p.id as string] ?? {};
    const vals = Object.values(ratings);
    const avg =
      vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const meta = (p.metadata as { slug?: string } | null) ?? {};
    return {
      id: p.id as string,
      slug: meta.slug ?? "",
      name: p.name as string,
      brand: (p.brand as string | null) ?? null,
      avg_score: Math.round(avg * 10) / 10,
      ratings,
    };
  });

  const sentDist = { positive: 0, neutral: 0, negative: 0 };
  for (const s of sRes.data ?? []) {
    const k = s.sentiment as keyof typeof sentDist;
    if (k in sentDist) sentDist[k]++;
  }

  return {
    domain,
    products: productSummary.sort((a, b) => b.avg_score - a.avg_score),
    counts: {
      products: products.length,
      documents: dRes.data?.length ?? 0,
      chunks: chunks.length,
      topics: tRes.data?.length ?? 0,
      ask_queries: qRes.data?.length ?? 0,
    },
    topics: (tRes.data ?? []).map((t) => ({
      label: t.label as string,
      keywords: (t.keywords as string[]) ?? [],
      doc_count: (t.doc_count as number) ?? 0,
    })),
    sentiment_dist: sentDist,
  };
}

export type JourneyChunkDetail = {
  chunk_id: string;
  text: string;
  author: string | null;
  source_type: string;
  source_url: string | null;
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  intensity: number;
  confidence: number;
};

/**
 * S4 — product 의 journey_assignments + chunks + sentiments + documents 를
 * stage_key 별로 그룹핑.
 */
export async function getJourneyDetail(
  productId: string
): Promise<Record<string, JourneyChunkDetail[]>> {
  const { data: ja, error: e1 } = await supabase
    .from("journey_assignments")
    .select("chunk_id, stage_key, confidence")
    .eq("product_id", productId);
  if (e1) throw e1;
  const items = ja ?? [];
  if (items.length === 0) return {};

  const chunkIds = items.map((j) => j.chunk_id as string);
  const { data: chunks } = await supabase
    .from("chunks")
    .select("id, text, document_id")
    .in("id", chunkIds);
  const docIds = Array.from(
    new Set((chunks ?? []).map((c) => c.document_id as string))
  );
  const { data: docs } = await supabase
    .from("documents")
    .select("id, author, source_type, source_url")
    .in("id", docIds);
  const { data: sents } = await supabase
    .from("sentiments")
    .select("chunk_id, sentiment, intensity")
    .in("chunk_id", chunkIds);

  const chunkMap = Object.fromEntries(
    (chunks ?? []).map((c) => [c.id as string, c])
  );
  const docMap = Object.fromEntries(
    (docs ?? []).map((d) => [d.id as string, d])
  );
  const sentMap = Object.fromEntries(
    (sents ?? []).map((s) => [s.chunk_id as string, s])
  );

  const grouped: Record<string, JourneyChunkDetail[]> = {};
  for (const j of items) {
    const stage = j.stage_key as string;
    const c = chunkMap[j.chunk_id as string];
    if (!c) continue;
    const d = docMap[c.document_id as string];
    const s = sentMap[j.chunk_id as string];
    (grouped[stage] ??= []).push({
      chunk_id: j.chunk_id as string,
      text: c.text as string,
      author: (d?.author as string | null) ?? null,
      source_type: (d?.source_type as string) ?? "unknown",
      source_url: (d?.source_url as string | null) ?? null,
      sentiment:
        (s?.sentiment as JourneyChunkDetail["sentiment"]) ?? "unknown",
      intensity: Number(s?.intensity ?? 0),
      confidence: Number(j.confidence ?? 0),
    });
  }

  // 단계별 confidence DESC 정렬
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => b.confidence - a.confidence);
  }
  return grouped;
}

/**
 * S1 화면이 필요한 모든 데이터를 묶어서 한 번에 반환.
 */
export async function getS1Data(domainSlug: string, productSlug: string) {
  const domain = await getDomain(domainSlug);
  const product = await getProductBySlug(domain.id, productSlug);
  const [ratings, sentiments, journey, documents, topics] = await Promise.all([
    getRatings(product.id),
    getSentimentsForProduct(product.id),
    getJourney(product.id),
    getDocumentsByProduct(product.id),
    getTopics(domain.id),
  ]);

  // 각 axis 의 evidence chunk ids 합집합
  const allEvidenceIds = Array.from(
    new Set(ratings.flatMap((r) => r.evidence_chunk_ids))
  );
  const evidenceChunks = await getChunks(allEvidenceIds);

  return {
    domain,
    product,
    ratings,
    sentiments,
    journey,
    documents,
    topics,
    evidenceChunks,
  };
}
