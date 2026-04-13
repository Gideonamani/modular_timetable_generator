export interface PageSlice {
  srcTop: number;
  srcBottom: number;
}

/**
 * Divides a source document of `srcHeight` CSS pixels into pages that fit
 * within `printableHeight` PDF points, breaking only at the supplied
 * `breakPoints` (row bottoms, week-row bottoms, legend start, etc.).
 *
 * @param breakPoints  Raw break candidates in CSS pixels (unsorted, may contain
 *                     duplicates or out-of-range values — all sanitised here).
 * @param srcHeight    Total content height in CSS pixels (element.scrollHeight).
 * @param scale        CSS-pixel → PDF-point scale factor (printableWidth / srcWidth).
 * @param printableHeight  Maximum page content height in PDF points.
 * @returns            Ordered array of non-overlapping, gap-free page slices.
 *                     Every srcTop and srcBottom is a value drawn from the
 *                     sanitised break-point list, guaranteeing that page
 *                     boundaries never fall inside a row.
 */
export function computePages(
  breakPoints: number[],
  srcHeight: number,
  scale: number,
  printableHeight: number,
): PageSlice[] {
  // Sanitise: deduplicate, round to integers, clamp to [0, srcHeight], sort.
  const unique = [...new Set(breakPoints.map(Math.round))]
    .filter(b => b >= 0 && b <= srcHeight)
    .sort((a, b) => a - b);

  // Ensure 0 and srcHeight are always present as sentinels.
  if (unique[0] !== 0) unique.unshift(0);
  if (unique[unique.length - 1] !== srcHeight) unique.push(srcHeight);

  const pages: PageSlice[] = [];
  let currentPageTop = 0;

  for (let i = 1; i < unique.length; i++) {
    const pageContentHeight = (unique[i] - currentPageTop) * scale;

    if (pageContentHeight > printableHeight) {
      // Walk backwards from i-1 to find the last break that fits.
      let bestBreak = currentPageTop;
      for (let j = i - 1; j >= 0; j--) {
        if (
          unique[j] > currentPageTop &&
          (unique[j] - currentPageTop) * scale <= printableHeight
        ) {
          bestBreak = unique[j];
          break;
        }
      }

      // Fallback: if even a single segment exceeds a page (e.g. one enormous
      // row), force-cut at the current candidate so we always make progress.
      if (bestBreak === currentPageTop) bestBreak = unique[i];

      pages.push({ srcTop: currentPageTop, srcBottom: bestBreak });
      currentPageTop = bestBreak;
      i--; // re-examine this index against the new currentPageTop
    }
  }

  // Flush any remaining content as the final page.
  if (currentPageTop < srcHeight) {
    pages.push({ srcTop: currentPageTop, srcBottom: srcHeight });
  }

  return pages;
}
