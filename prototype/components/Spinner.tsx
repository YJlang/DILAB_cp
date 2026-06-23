import { Loader2 } from "lucide-react";

/* 기다림이 필요한 버튼·영역의 공용 스피너.
   prefers-reduced-motion 시 globals.css 가 animation 을 0s 로 강제 → 회전이 멈추므로
   호출부는 항상 "분석 중…" 같은 텍스트 라벨을 함께 노출할 것. */
export function Spinner({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      strokeWidth={2.5}
      className={`animate-spin ${className}`}
      aria-hidden
    />
  );
}
