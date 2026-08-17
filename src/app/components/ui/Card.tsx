"use client";

export function Card({
  children,
  className = "",
  selected = false,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  as?: "div" | "article";
}) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-xl border bg-bg transition-colors ${
        selected ? "border-accent shadow-sm" : "border-border"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}