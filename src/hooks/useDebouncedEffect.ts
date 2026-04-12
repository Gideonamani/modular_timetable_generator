import * as React from "react";

export function useDebouncedEffect(
  effect: () => void,
  deps: React.DependencyList,
  delay: number
) {
  React.useEffect(() => {
    const timer = setTimeout(effect, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
