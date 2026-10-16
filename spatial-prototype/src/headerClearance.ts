/** Keep absolute atlas UI below the actual wrapped header, in root coordinates. */
export function bindHeaderClearance(root: HTMLElement) {
  const header = root.querySelector<HTMLElement>(".masthead")!;
  const intro = root.querySelector<HTMLElement>(".room-caption")!;
  let active = true;
  const update = () => {
    if (!active) return;
    const origin = root.getBoundingClientRect().top;
    const below = (node: HTMLElement) => Math.ceil(node.getBoundingClientRect().bottom - origin) + 12;
    root.style.setProperty("--atlas-header-clearance", `${below(header)}px`);
    // Read after setting the header clearance: the intro may have moved with it.
    root.style.setProperty("--atlas-intro-clearance", `${intro.offsetHeight ? below(intro) : 0}px`);
  };
  update();
  const observer = new ResizeObserver(update);
  [root, header, intro].forEach(node => observer.observe(node));
  window.addEventListener("resize", update);
  void document.fonts.ready.then(update);
  return () => {
    active = false;
    observer.disconnect();
    window.removeEventListener("resize", update);
    root.style.removeProperty("--atlas-header-clearance");
    root.style.removeProperty("--atlas-intro-clearance");
  };
}
