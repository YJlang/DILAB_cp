"use client";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
} from "recharts";

// DESIGN.md §3.1 토큰 hex — Recharts 는 Tailwind 클래스 미지원이라 hex 직접.
const C = {
  grid: "#D6D3D1", // stone-300
  tickStrong: "#44403C", // ink-soft
  tickMute: "#78716C", // muted
  brand: "#4338CA", // brand (제품 점수)
  accent: "#B45309", // accent (카테고리 평균)
};

type AxisPoint = { axis: string; product: number; category?: number };

export function RadarChart({
  data,
  height = 320,
}: {
  data: AxisPoint[];
  height?: number;
}) {
  const summary = data
    .map((d) => `${d.axis} ${d.product.toFixed(1)}점`)
    .join(", ");
  return (
    <div role="img" aria-label={`5축 점수: ${summary}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid strokeDasharray="2 3" stroke={C.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 12, fontWeight: 600, fill: C.tickStrong }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: C.tickMute }}
            axisLine={false}
          />
          {data[0]?.category !== undefined && (
            <Radar
              name="카테고리 평균"
              dataKey="category"
              stroke={C.accent}
              strokeDasharray="3 3"
              fill={C.accent}
              fillOpacity={0.1}
            />
          )}
          <Radar
            name="이 제품"
            dataKey="product"
            stroke={C.brand}
            fill={C.brand}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
