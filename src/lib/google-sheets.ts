import Papa from 'papaparse';
import { Module } from '../types';
import { COLORS } from './constants';

/**
 * Returns the value unchanged if it is a valid CSS hex color (#rgb or #rrggbb),
 * otherwise returns undefined so callers can fall back to the auto palette.
 * CSS named colors (e.g. "coral") are intentionally rejected — <input type="color">
 * requires a hex string and silently breaks with named values.
 */
function resolveHexColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : undefined;
}

export function extractGoogleSheetInfo(url: string) {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[#&]gid=([0-9]+)/);
  
  if (!idMatch) {
    // Maybe they pasted the standalone ID
    if (/^[a-zA-Z0-9-_]{20,}$/.test(url.trim())) {
      return { spreadsheetId: url.trim(), gid: "0" };
    }
    return { spreadsheetId: null, gid: null };
  }
  
  return { 
    spreadsheetId: idMatch[1], 
    gid: gidMatch ? gidMatch[1] : "0" 
  };
}

export async function fetchModulesFromSheet(url: string): Promise<Module[]> {
  const { spreadsheetId, gid } = extractGoogleSheetInfo(url);
  
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  return new Promise((resolve, reject) => {
    Papa.parse(exportUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Failed to parse CSV from Google Sheet. Make sure the sheet is public or accessible.'));
          return;
        }

        try {
          const modules: Module[] = results.data.map((row: any, index: number) => {
            // Find columns by various names (case insensitive)
            const keys = Object.keys(row);
            const getCol = (possibleNames: string[]) => {
              const key = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
              return key ? row[key] : undefined;
            };

            const name = getCol(['name', 'module', 'module name', 'title']) || `Module ${index + 1}`;
            const daysStr = getCol(['days', 'duration', 'length']);
            const days = parseInt(daysStr, 10) || 1;
            const instructor = getCol(['instructor', 'teacher', 'tutor']);
            const colorParam = getCol(['color', 'colour', 'bg']);
            
            const color = resolveHexColor(colorParam) ?? COLORS[index % COLORS.length];

            return {
              id: crypto.randomUUID(),
              name: String(name).trim(),
              days,
              color,
              instructor: instructor ? String(instructor).trim() : undefined,
            };
          });

          resolve(modules);
        } catch (err) {
          reject(err);
        }
      },
      error: (error: Error) => {
        reject(new Error(`Network error grabbing Google Sheet: ${error.message}`));
      }
    });
  });
}
