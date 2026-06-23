"use client";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
} from "recharts";

// DESIGN.md §3.1 토큰 hex — A=brand, B=accent (compare 페이지 색 대응).
const C = {
  grid: "#D6D3D1",
  tickStrong: "#44403C",
  tickMute: "#78716C",
  brand: "#4338CA", // A
  accent: "#B45309", // B
};

type Point = { axis: string; a: number; b: number };

export function CompareRadar({
  data,
  aLabel,
  bLabel,
  height = 360,
}: {
  data: Point[];
  aLabel: string;
  bLabel: string;
  height?: number;
}) {
  const summary = data
    .map((d) => `${d.axis}: ${aLabel} ${d.a.toFixed(1)}, ${bLabel} ${d.b.toFixed(1)}`)
    .join(" | ");
  return (
    <div role="img" aria-label={`5축 비교 — ${summary}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="70%">
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
          <Radar
            name={aLabel}
            dataKey="a"
            stroke={C.brand}
            fill={C.brand}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name={bLabel}
            dataKey="b"
            stroke={C.accent}
            fill={C.accent}
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
