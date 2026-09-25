import { useEffect, useRef, useState } from "react";

// Tracks the content-box width (in whole pixels) of the element the returned
// ref is attached to. Starts at 0 until the element has been measured.
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
