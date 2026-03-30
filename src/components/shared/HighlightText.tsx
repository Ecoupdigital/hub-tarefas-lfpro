import React from "react";

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  if (!query || !text) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRegex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(splitRegex);

  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  // Use a separate non-global regex for testing to avoid lastIndex statefulness
  const testRegex = new RegExp(`^${escapedQuery}$`, "i");

  return (
    <span className={className}>
      {parts.map((part, i) =>
        testRegex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/20 text-primary rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}
