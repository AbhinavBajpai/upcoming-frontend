import { useEffect, type RefObject } from "react";
import { scrollOffset } from "./scrollOffset";

export function useMonthScrollOffset(
  rootRef: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    const root = rootRef.current;
    const controls = root?.querySelector("[data-month-navigation]");
    const header = document.querySelector(".site-header");
    if (!root || !controls) return;
    const measure = () =>
      root.style.setProperty("--release-scroll-offset", `${scrollOffset()}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    if (header) observer.observe(header);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rootRef, active]);
}
