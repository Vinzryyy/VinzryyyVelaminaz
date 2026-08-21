/**
 * A thin horizontal line with a crimson-to-gold gradient.
 * Animates in on hover (when inside a .group) or when `active` is true.
 */
export function KatanaDivider({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`katana-line ${active ? "is-active" : ""} ${className}`}
      aria-hidden="true"
    />
  );
}
