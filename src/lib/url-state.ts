import LZString from 'lz-string';
import { Module } from '../types';

export interface TimetableState {
  timetableTitle: string;
  timetableSubtitle: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  skipWeekends: boolean;
  holidays: string[]; // ISO strings
  modules: Module[];
  viewMode?: 'list' | 'grid';
  isDarkMode?: boolean;
}

/**
 * Compresses the timetable state into a URL-safe string.
 */
export function compressState(state: TimetableState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decompresses a URL-safe string back into a timetable state.
 */
export function decompressState(compressed: string): TimetableState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to decompress state', err);
    return null;
  }
}

/**
 * Generates the full shareable URL for the current state.
 */
export function generateShareUrl(state: TimetableState): string {
  const compressed = compressState(state);
  const url = new URL(window.location.href);
  url.searchParams.set('state', compressed);
  return url.toString();
}

/**
 * Extracts the state from the current URL if present.
 */
export function getStateFromUrl(): TimetableState | null {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('state');
  if (!compressed) return null;
  return decompressState(compressed);
}
