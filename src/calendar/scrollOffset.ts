// Header plus the visible mobile month controls (inactive pages stay mounted).
export function scrollOffset() {
  const header =
    document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  const controls = [
    ...document.querySelectorAll<HTMLElement>("[data-month-navigation]"),
  ].find((element) => element.getClientRects().length > 0);
  const extra =
    window.innerWidth <= 560 && controls?.getClientRects().length
      ? controls.getBoundingClientRect().height
      : 0;
  return header + extra + 12;
}
