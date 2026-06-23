// 도메인 타입 — Supabase 스키마와 1:1 매핑 (수동, generate_typescript_types 도구 활용 가능)

export type Domain = {
  id: string;
  slug: string;
  name: string;
  categories: string[];
  rating_axes: string[];
  journey_stages: { key: string; label: string; order: number }[];
};

export type Product = {
  id: string;
  domain_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
};

export type Rating = {
  id: string;
  product_id: string;
  axis: string;
  score: number;
  evidence_chunk_ids: string[];
  generated_by: string | null;
  generated_at: string;
};

export type Chunk = {
  id: string;
  text: string;
  document_id: string;
};

export type Document = {
  id: string;
  source_type: "expert" | "public_review" | string;
  author: string | null;
  author_credibility: number | null;
  source_url: string | null;
  title: string | null;
};

export type Sentiment = {
  chunk_id: string;
  sentiment: "positive" | "neutral" | "negative";
  intensity: number;
};

export type Topic = {
  id: string;
  topic_index: number;
  label: string;
  keywords: string[];
  doc_count: number;
};

export type JourneyAssignment = {
  chunk_id: string;
  product_id: string;
  stage_key: string;
  confidence: number;
  is_estimated: boolean;
};
