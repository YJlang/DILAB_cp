/**
 * Server-side data fetchers — **Oracle 26ai** 판 (원본 Supabase REST 대체).
 *
 * ⚠️ 로컬 dev 전용(node-oracledb). 함수 시그니처·반환 타입은 원본과 100% 동일 →
 * 페이지·컴포넌트는 변경 없이 그대로 동작. JSON 컬럼(jsonb/배열)은 CLOB→JSON.parse.
 */
import { q, jsonIn } from "./oracle";
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

function pj<T>(s: unknown, fallback: T): T {
  try {
    return s ? (JSON.parse(s as string) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getDomain(slug: string): Promise<Domain> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", slug "slug", name "name", categories "categories",
            rating_axes "rating_axes", journey_stages "journey_stages"
     FROM domains WHERE slug = :slug`,
    { slug },
  );
  const d = rows[0];
  if (!d) throw new Error(`domain not found: ${slug}`);
  return {
    id: d.id as string,
    slug: d.slug as string,
    name: d.name as string,
    categories: pj(d.categories, [] as string[]),
    rating_axes: pj(d.rating_axes, [] as string[]),
    journey_stages: pj(d.journey_stages, [] as Domain["journey_stages"]),
  };
}

export async function listProductsInDomain(
  domainSlug: string,
): Promise<Array<{ slug: string; name: string; brand: string | null }>> {
  const domain = await getDomain(domainSlug);
  const rows = await q<Record<string, unknown>>(
    `SELECT name "name", brand "brand", metadata "metadata" FROM products WHERE domain_id = :d`,
    { d: domain.id },
  );
  return rows
    .map((p) => {
      const meta = pj(p.metadata, {} as { slug?: string });
      return { slug: meta.slug ?? "", name: p.name as string, brand: (p.brand as string | null) ?? null };
    })
    .filter((p) => p.slug);
}

export async function getProductBySlug(domainId: string, productSlug: string): Promise<Product> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", domain_id "domain_id", name "name", brand "brand",
            category "category", metadata "metadata"
     FROM products WHERE domain_id = :d`,
    { d: domainId },
  );
  const found = rows.find((p) => pj(p.metadata, {} as { slug?: string }).slug === productSlug);
  if (!found) throw new Error(`product not found: ${productSlug}`);
  return {
    id: found.id as string,
    domain_id: found.domain_id as string,
    name: found.name as string,
    brand: (found.brand as string | null) ?? null,
    category: (found.category as string | null) ?? null,
    metadata: pj(found.metadata, {} as Record<string, unknown>),
  };
}

export async function getRatings(productId: string): Promise<Rating[]> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", product_id "product_id", axis "axis", score "score",
            evidence_chunk_ids "evidence_chunk_ids", generated_by "generated_by",
            generated_at "generated_at"
     FROM ratings WHERE product_id = :p`,
    { p: productId },
  );
  return rows.map((r) => ({
    id: r.id as string,
    product_id: r.product_id as string,
    axis: r.axis as string,
    score: Number(r.score),
    evidence_chunk_ids: pj(r.evidence_chunk_ids, [] as string[]),
    generated_by: (r.generated_by as string | null) ?? null,
    generated_at: (r.generated_at as string) ?? "",
  }));
}

export async function getChunks(chunkIds: string[]): Promise<Chunk[]> {
  if (chunkIds.length === 0) return [];
  const rows = await q<Chunk>(
    `SELECT id "id", text "text", document_id "document_id"
     FROM chunks WHERE id IN (${jsonIn("ids")})`,
    { ids: JSON.stringify(chunkIds) },
  );
  return rows;
}

export async function getDocumentsByProduct(productId: string): Promise<Document[]> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", source_type "source_type", author "author",
            author_credibility "author_credibility", source_url "source_url", title "title"
     FROM documents WHERE product_id = :p`,
    { p: productId },
  );
  return rows.map((d) => ({
    id: d.id as string,
    source_type: d.source_type as string,
    author: (d.author as string | null) ?? null,
    author_credibility: d.author_credibility == null ? null : Number(d.author_credibility),
    source_url: (d.source_url as string | null) ?? null,
    title: (d.title as string | null) ?? null,
  }));
}

export async function getSentimentsForProduct(productId: string): Promise<Sentiment[]> {
  const rows = await q<Record<string, unknown>>(
    `SELECT chunk_id "chunk_id", sentiment "sentiment", intensity "intensity"
     FROM sentiments WHERE chunk_id IN (
       SELECT id FROM chunks WHERE document_id IN (
         SELECT id FROM documents WHERE product_id = :p))`,
    { p: productId },
  );
  return rows.map((s) => ({
    chunk_id: s.chunk_id as string,
    sentiment: s.sentiment as Sentiment["sentiment"],
    intensity: Number(s.intensity),
  }));
}

export async function getTopics(domainId: string): Promise<Topic[]> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", topic_index "topic_index", label "label", keywords "keywords",
            doc_count "doc_count"
     FROM topics WHERE domain_id = :d AND topic_index <> -1 ORDER BY doc_count DESC`,
    { d: domainId },
  );
  return rows.map((t) => ({
    id: t.id as string,
    topic_index: Number(t.topic_index),
    label: t.label as string,
    keywords: pj(t.keywords, [] as string[]),
    doc_count: Number(t.doc_count),
  }));
}

export async function getJourney(productId: string): Promise<JourneyAssignment[]> {
  const rows = await q<Record<string, unknown>>(
    `SELECT chunk_id "chunk_id", product_id "product_id", stage_key "stage_key",
            confidence "confidence", is_estimated "is_estimated"
     FROM journey_assignments WHERE product_id = :p`,
    { p: productId },
  );
  return rows.map((j) => ({
    chunk_id: j.chunk_id as string,
    product_id: j.product_id as string,
    stage_key: j.stage_key as string,
    confidence: Number(j.confidence),
    is_estimated: !!Number(j.is_estimated),
  }));
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

export async function getTopicsWithChunks(domainSlug: string): Promise<TopicWithChunks[]> {
  const domain = await getDomain(domainSlug);
  const topics = await q<Record<string, unknown>>(
    `SELECT id "id", label "label", keywords "keywords", doc_count "doc_count",
            topic_index "topic_index"
     FROM topics WHERE domain_id = :d AND topic_index <> -1 ORDER BY doc_count DESC`,
    { d: domain.id },
  );
  if (topics.length === 0) return [];

  return Promise.all(
    topics.map(async (t) => {
      const inTopic = `SELECT chunk_id FROM topic_assignments WHERE topic_id = :t`;
      let detail: TopicWithChunks["chunks"] = [];
      const sentCounts = { positive: 0, neutral: 0, negative: 0 };
      const chunks = await q<{ id: string; text: string; document_id: string }>(
        `SELECT id "id", text "text", document_id "document_id"
         FROM chunks WHERE id IN (${inTopic})`,
        { t: t.id as string },
      );
      if (chunks.length > 0) {
        const sents = await q<{ chunk_id: string; sentiment: string }>(
          `SELECT chunk_id "chunk_id", sentiment "sentiment"
           FROM sentiments WHERE chunk_id IN (${inTopic})`,
          { t: t.id as string },
        );
        const docs = await q<{ id: string; author: string | null; source_type: string }>(
          `SELECT id "id", author "author", source_type "source_type"
           FROM documents WHERE id IN (SELECT document_id FROM chunks WHERE id IN (${inTopic}))`,
          { t: t.id as string },
        );
        const docMap = Object.fromEntries(docs.map((d) => [d.id, d]));
        const sentMap = Object.fromEntries(sents.map((s) => [s.chunk_id, s.sentiment]));
        detail = chunks.map((c) => {
          const d = docMap[c.document_id];
          return {
            chunk_id: c.id,
            text: c.text,
            author: d?.author ?? null,
            source_type: d?.source_type ?? "unknown",
            sentiment: sentMap[c.id] ?? "unknown",
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
        topic_index: Number(t.topic_index),
        label: t.label as string,
        keywords: pj(t.keywords, [] as string[]),
        doc_count: Number(t.doc_count),
        chunks: detail.slice(0, 8),
        sentiment: sentCounts,
      };
    }),
  );
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
  counts: { products: number; documents: number; chunks: number; topics: number; ask_queries: number };
  topics: Array<{ label: string; keywords: string[]; doc_count: number }>;
  sentiment_dist: { positive: number; neutral: number; negative: number };
};

export async function getDomainStats(domainSlug: string): Promise<DomainStats> {
  const domain = await getDomain(domainSlug);

  const [products, dCount, cCount, topics, qCount, sents, ratings] = await Promise.all([
    q<Record<string, unknown>>(
      `SELECT id "id", name "name", brand "brand", metadata "metadata"
       FROM products WHERE domain_id = :d`,
      { d: domain.id },
    ),
    q<{ n: number }>(`SELECT COUNT(*) "n" FROM documents WHERE domain_id = :d`, { d: domain.id }),
    q<{ n: number }>(`SELECT COUNT(*) "n" FROM chunks WHERE domain_id = :d`, { d: domain.id }),
    q<Record<string, unknown>>(
      `SELECT label "label", keywords "keywords", doc_count "doc_count", topic_index "topic_index"
       FROM topics WHERE domain_id = :d AND topic_index <> -1 ORDER BY doc_count DESC`,
      { d: domain.id },
    ),
    q<{ n: number }>(`SELECT COUNT(*) "n" FROM ask_queries WHERE domain_id = :d`, { d: domain.id }),
    q<{ sentiment: string }>(
      `SELECT sentiment "sentiment" FROM sentiments
       WHERE chunk_id IN (SELECT id FROM chunks WHERE domain_id = :d)`,
      { d: domain.id },
    ),
    q<{ product_id: string; axis: string; score: number }>(
      `SELECT product_id "product_id", axis "axis", score "score" FROM ratings
       WHERE product_id IN (SELECT id FROM products WHERE domain_id = :d)`,
      { d: domain.id },
    ),
  ]);

  const ratingsByProduct: Record<string, Record<string, number>> = {};
  for (const r of ratings) {
    (ratingsByProduct[r.product_id] ??= {})[r.axis] = Number(r.score);
  }
  const productSummary: DomainProductSummary[] = products.map((p) => {
    const rmap = ratingsByProduct[p.id as string] ?? {};
    const vals = Object.values(rmap);
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const meta = pj(p.metadata, {} as { slug?: string });
    return {
      id: p.id as string,
      slug: meta.slug ?? "",
      name: p.name as string,
      brand: (p.brand as string | null) ?? null,
      avg_score: Math.round(avg * 10) / 10,
      ratings: rmap,
    };
  });

  const sentDist = { positive: 0, neutral: 0, negative: 0 };
  for (const s of sents) {
    const k = s.sentiment as keyof typeof sentDist;
    if (k in sentDist) sentDist[k]++;
  }

  return {
    domain,
    products: productSummary.sort((a, b) => b.avg_score - a.avg_score),
    counts: {
      products: products.length,
      documents: Number(dCount[0]?.n ?? 0),
      chunks: Number(cCount[0]?.n ?? 0),
      topics: topics.length,
      ask_queries: Number(qCount[0]?.n ?? 0),
    },
    topics: topics.map((t) => ({
      label: t.label as string,
      keywords: pj(t.keywords, [] as string[]),
      doc_count: Number(t.doc_count),
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

export async function getJourneyDetail(
  productId: string,
): Promise<Record<string, JourneyChunkDetail[]>> {
  const items = await q<{ chunk_id: string; stage_key: string; confidence: number }>(
    `SELECT chunk_id "chunk_id", stage_key "stage_key", confidence "confidence"
     FROM journey_assignments WHERE product_id = :p`,
    { p: productId },
  );
  if (items.length === 0) return {};

  const inJourney = `SELECT chunk_id FROM journey_assignments WHERE product_id = :p`;
  const chunks = await q<{ id: string; text: string; document_id: string }>(
    `SELECT id "id", text "text", document_id "document_id"
     FROM chunks WHERE id IN (${inJourney})`,
    { p: productId },
  );
  const docs = await q<{ id: string; author: string | null; source_type: string; source_url: string | null }>(
    `SELECT id "id", author "author", source_type "source_type", source_url "source_url"
     FROM documents WHERE id IN (SELECT document_id FROM chunks WHERE id IN (${inJourney}))`,
    { p: productId },
  );
  const sents = await q<{ chunk_id: string; sentiment: string; intensity: number }>(
    `SELECT chunk_id "chunk_id", sentiment "sentiment", intensity "intensity"
     FROM sentiments WHERE chunk_id IN (${inJourney})`,
    { p: productId },
  );

  const chunkMap = Object.fromEntries(chunks.map((c) => [c.id, c]));
  const docMap = Object.fromEntries(docs.map((d) => [d.id, d]));
  const sentMap = Object.fromEntries(sents.map((s) => [s.chunk_id, s]));

  const grouped: Record<string, JourneyChunkDetail[]> = {};
  for (const j of items) {
    const c = chunkMap[j.chunk_id];
    if (!c) continue;
    const d = docMap[c.document_id];
    const s = sentMap[j.chunk_id];
    (grouped[j.stage_key] ??= []).push({
      chunk_id: j.chunk_id,
      text: c.text,
      author: d?.author ?? null,
      source_type: d?.source_type ?? "unknown",
      source_url: d?.source_url ?? null,
      sentiment: (s?.sentiment as JourneyChunkDetail["sentiment"]) ?? "unknown",
      intensity: Number(s?.intensity ?? 0),
      confidence: Number(j.confidence ?? 0),
    });
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => b.confidence - a.confidence);
  }
  return grouped;
}

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

  const allEvidenceIds = Array.from(new Set(ratings.flatMap((r) => r.evidence_chunk_ids)));
  const evidenceChunks = await getChunks(allEvidenceIds);

  return { domain, product, ratings, sentiments, journey, documents, topics, evidenceChunks };
}
