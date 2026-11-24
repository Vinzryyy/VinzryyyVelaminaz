import { Fragment } from "react";
import { splitHighlights } from "@/lib/highlight";

/** Renders text with its **marked** words wrapped in <strong className={highlightClassName}>. */
export function HighlightedText({
  text,
  highlightClassName,
}: {
  text: string;
  highlightClassName: string;
}) {
  return (
    <>
      {splitHighlights(text).map((part, i) =>
        part.highlight ? (
          <strong key={i} className={highlightClassName}>
            {part.text}
          </strong>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
