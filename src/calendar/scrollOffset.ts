// Fixed header and, on mobile Releases, the sticky month controls.
export function scrollOffset() {
  const header =
    document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  const controls = document.querySelector<HTMLElement>(
    ".release-month-navigation",
  );
  const extra =
    window.innerWidth <= 560 && controls?.getClientRects().length
      ? controls.getBoundingClientRect().height
      : 0;
  return header + extra + 12;
}
