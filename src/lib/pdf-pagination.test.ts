import { describe, it, expect } from 'vitest';
import { computePages, PageSlice } from './pdf-pagination';

// ---------------------------------------------------------------------------
// Realistic constants matching the actual PDF export pipeline
// ---------------------------------------------------------------------------
// srcWidth of a typical timetable render (CSS px)
const SRC_WIDTH = 800;
// A4 printable width in pt (595.28 - 2*28 margins)
const PRINTABLE_WIDTH = 539.28;
// A4 printable height in pt (841.89 - 2*28 margins - 20 footer)
const PRINTABLE_HEIGHT = 765.89;
// scale: CSS px → PDF pt
const SCALE = PRINTABLE_WIDTH / SRC_WIDTH; // ≈ 0.6741

// Row heights in CSS px that match what the live timetable produces
const HEADER_ROW_H = 44;   // <thead> <tr>
const NORMAL_ROW_H = 48;   // module row (name only)
const TALL_ROW_H   = 64;   // module row (name + instructor)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a break-point array from an array of row heights (header + data). */
function makeBreakPoints(rowHeights: number[]): number[] {
  const points: number[] = [0];
  let cursor = 0;
  for (const h of rowHeights) {
    cursor += h;
    points.push(cursor);
  }
  return points;
}

/** Total height from an array of row heights. */
const totalHeight = (rowHeights: number[]) => rowHeights.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Core invariant helpers (reused across many tests)
// ---------------------------------------------------------------------------

function assertInvariants(
  pages: PageSlice[],
  srcHeight: number,
  breakPoints: number[],
  scale: number,
  printableHeight: number,
) {
  const sanitised = [...new Set(breakPoints.map(Math.round))]
    .filter(b => b >= 0 && b <= srcHeight)
    .sort((a, b) => a - b);
  const bpSet = new Set(sanitised);

  expect(pages.length).toBeGreaterThan(0);

  // 1. First page starts at 0
  expect(pages[0].srcTop).toBe(0);

  // 2. Last page ends at srcHeight
  expect(pages[pages.length - 1].srcBottom).toBe(srcHeight);

  // 3. Pages are contiguous — no gaps, no overlaps
  for (let i = 1; i < pages.length; i++) {
    expect(pages[i].srcTop).toBe(pages[i - 1].srcBottom);
  }

  // 4. Every boundary is a value from the sanitised break-point set
  //    (guarantees page cuts never fall inside a row)
  for (const { srcTop, srcBottom } of pages) {
    expect(bpSet.has(srcTop), `srcTop ${srcTop} not in break-point set`).toBe(true);
    expect(bpSet.has(srcBottom), `srcBottom ${srcBottom} not in break-point set`).toBe(true);
  }

  // 5. No page (except a force-cut fallback) exceeds printableHeight
  //    Allow one row of tolerance for the fallback case
  for (const { srcTop, srcBottom } of pages) {
    const h = (srcBottom - srcTop) * scale;
    expect(h).toBeLessThanOrEqual(printableHeight + TALL_ROW_H * scale + 1);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computePages', () => {

  // --- Basic correctness ---

  it('returns a single page when all content fits', () => {
    const rows = [HEADER_ROW_H, ...Array(5).fill(NORMAL_ROW_H)];
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ srcTop: 0, srcBottom: srcHeight });
  });

  it('produces exactly 2 pages when content is just over one page', () => {
    // Fill just over one printable page with normal rows
    const rowsPerPage = Math.floor(PRINTABLE_HEIGHT / (NORMAL_ROW_H * SCALE));
    const rows = Array(rowsPerPage + 2).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    expect(pages).toHaveLength(2);
    assertInvariants(pages, srcHeight, bp, SCALE, PRINTABLE_HEIGHT);
  });

  it('handles many pages of uniform rows correctly', () => {
    const rows = Array(100).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    expect(pages.length).toBeGreaterThanOrEqual(2);
    assertInvariants(pages, srcHeight, bp, SCALE, PRINTABLE_HEIGHT);
  });

  it('handles mixed row heights without cutting any row', () => {
    const rows = [
      HEADER_ROW_H,
      ...Array(10).fill(NORMAL_ROW_H),
      ...Array(5).fill(TALL_ROW_H),
      ...Array(10).fill(NORMAL_ROW_H),
      ...Array(8).fill(TALL_ROW_H),
      ...Array(15).fill(NORMAL_ROW_H),
    ];
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    assertInvariants(pages, srcHeight, bp, SCALE, PRINTABLE_HEIGHT);
  });

  // --- Edge: single-row edge cases ---

  it('handles a single row that exactly fills the page', () => {
    const exactH = Math.floor(PRINTABLE_HEIGHT / SCALE);
    const bp = [0, exactH];
    const pages = computePages(bp, exactH, SCALE, PRINTABLE_HEIGHT);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ srcTop: 0, srcBottom: exactH });
  });

  it('force-cuts a single row that is taller than one page', () => {
    // One enormous row — must still produce output with no infinite loop
    const hugeH = Math.ceil(PRINTABLE_HEIGHT / SCALE) * 3;
    const bp = [0, hugeH];
    const pages = computePages(bp, hugeH, SCALE, PRINTABLE_HEIGHT);

    // Should produce exactly one page (force-cut)
    expect(pages).toHaveLength(1);
    expect(pages[0].srcTop).toBe(0);
    expect(pages[0].srcBottom).toBe(hugeH);
  });

  it('handles srcHeight of zero', () => {
    const pages = computePages([0], 0, SCALE, PRINTABLE_HEIGHT);
    expect(pages).toHaveLength(0);
  });

  // --- Invariant: page boundaries only land on break points ---

  it('never places a page boundary inside a row', () => {
    // Simulate a realistic 5-week timetable (Mon–Fri, 5 weeks = 25 rows + header)
    const rows = [HEADER_ROW_H, ...Array(25).fill(TALL_ROW_H)];
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const bpSet = new Set(bp.map(Math.round));

    for (const { srcTop, srcBottom } of pages) {
      expect(bpSet.has(srcTop)).toBe(true);
      expect(bpSet.has(srcBottom)).toBe(true);
    }
  });

  it('never places a page boundary inside a row for a 3-month timetable', () => {
    // ~65 working days
    const rows = [HEADER_ROW_H, ...Array(65).fill(TALL_ROW_H)];
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const bpSet = new Set(bp.map(Math.round));

    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const { srcTop, srcBottom } of pages) {
      expect(bpSet.has(srcTop)).toBe(true);
      expect(bpSet.has(srcBottom)).toBe(true);
    }
  });

  // --- Invariant: full coverage, no gaps ---

  it('covers the full srcHeight with no gaps or overlaps', () => {
    const rows = [HEADER_ROW_H, ...Array(40).fill(NORMAL_ROW_H)];
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    // Reconstruct coverage
    let coverage = 0;
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) expect(pages[i].srcTop).toBe(pages[i - 1].srcBottom);
      coverage += pages[i].srcBottom - pages[i].srcTop;
    }
    expect(coverage).toBe(srcHeight);
  });

  // --- Invariant: maximises content per page ---

  it('packs as many rows as possible onto each page', () => {
    const rows = Array(50).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);

    const rowsPerPage = Math.floor(PRINTABLE_HEIGHT / (NORMAL_ROW_H * SCALE));
    // Each full page should hold exactly rowsPerPage rows
    // (last page may hold fewer)
    for (let p = 0; p < pages.length - 1; p++) {
      const rowsOnPage = (pages[p].srcBottom - pages[p].srcTop) / NORMAL_ROW_H;
      expect(rowsOnPage).toBe(rowsPerPage);
    }
  });

  // --- Input sanitisation ---

  it('ignores duplicate break points', () => {
    const rows = Array(20).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    // Introduce duplicates
    const duplicated = [...bp, ...bp, 0, srcHeight];
    const pages1 = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const pages2 = computePages(duplicated, srcHeight, SCALE, PRINTABLE_HEIGHT);
    expect(pages1).toEqual(pages2);
  });

  it('ignores out-of-range break points', () => {
    const rows = Array(20).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const withGarbage = [...bp, -100, srcHeight + 500, 999999];
    const pages1 = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const pages2 = computePages(withGarbage, srcHeight, SCALE, PRINTABLE_HEIGHT);
    expect(pages1).toEqual(pages2);
  });

  it('handles unsorted break points', () => {
    const rows = Array(20).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const shuffled = [...bp].sort(() => Math.random() - 0.5);
    const pages1 = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const pages2 = computePages(shuffled, srcHeight, SCALE, PRINTABLE_HEIGHT);
    expect(pages1).toEqual(pages2);
  });

  it('handles sub-pixel (fractional) break points via rounding', () => {
    // Simulate getBoundingClientRect returning fractional values
    const rows = Array(20).fill(NORMAL_ROW_H);
    const srcHeight = totalHeight(rows);
    const bp = makeBreakPoints(rows);
    const fractional = bp.map(b => b + 0.4); // add sub-pixel noise
    const pages1 = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const pages2 = computePages(fractional, srcHeight, SCALE, PRINTABLE_HEIGHT);
    // Results may differ by ±1px due to rounding — just check invariants hold
    assertInvariants(pages2, srcHeight, fractional, SCALE, PRINTABLE_HEIGHT);
    expect(pages1.length).toBe(pages2.length);
  });

  // --- Legend break point ---

  it('respects a legend break point that falls mid-page', () => {
    // 15 rows then a legend section of 80px
    const dataRows = Array(15).fill(NORMAL_ROW_H);
    const legendH = 80;
    const srcHeight = totalHeight(dataRows) + legendH;
    const dataBreaks = makeBreakPoints(dataRows);
    const legendTop = totalHeight(dataRows);
    const bp = [...dataBreaks, legendTop, srcHeight];

    const pages = computePages(bp, srcHeight, SCALE, PRINTABLE_HEIGHT);
    const bpSet = new Set(bp.map(Math.round));

    for (const { srcTop, srcBottom } of pages) {
      expect(bpSet.has(srcTop)).toBe(true);
      expect(bpSet.has(srcBottom)).toBe(true);
    }
  });
});
