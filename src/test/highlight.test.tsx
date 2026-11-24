import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { splitHighlights } from "@/lib/highlight";
import { HighlightedText } from "@/components/HighlightedText";

describe("splitHighlights", () => {
  it("returns plain text as a single part", () => {
    expect(splitHighlights("just text")).toEqual([{ text: "just text", highlight: false }]);
  });

  it("splits out each marked phrase", () => {
    expect(splitHighlights("shoots **live events** and **fan meets**.")).toEqual([
      { text: "shoots ", highlight: false },
      { text: "live events", highlight: true },
      { text: " and ", highlight: false },
      { text: "fan meets", highlight: true },
      { text: ".", highlight: false },
    ]);
  });

  it("handles marks at the very start and end", () => {
    expect(splitHighlights("**a** b **c**")).toEqual([
      { text: "a", highlight: true },
      { text: " b ", highlight: false },
      { text: "c", highlight: true },
    ]);
  });

  it("leaves an unclosed or empty mark as written", () => {
    expect(splitHighlights("a **b")).toEqual([{ text: "a **b", highlight: false }]);
    expect(splitHighlights("a **** b")).toEqual([{ text: "a **** b", highlight: false }]);
  });

  it("returns no parts for empty text", () => {
    expect(splitHighlights("")).toEqual([]);
  });
});

describe("HighlightedText", () => {
  it("wraps marked words in <strong> with the given class and drops the asterisks", () => {
    const { container } = render(
      <p>
        <HighlightedText text="a **b** c" highlightClassName="hl" />
      </p>,
    );
    const strong = container.querySelector("strong");
    expect(strong).toHaveTextContent("b");
    expect(strong).toHaveClass("hl");
    expect(container.textContent).toBe("a b c");
  });
});
