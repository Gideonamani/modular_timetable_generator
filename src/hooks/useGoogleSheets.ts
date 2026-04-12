import * as React from "react";
import { Module } from "../types";
import { fetchModulesFromSheet } from "../lib/google-sheets";

export function useGoogleSheets(
  setModules: (modules: Module[]) => void,
  initialSheetUrl = ''
) {
  const [sheetUrl, setSheetUrl] = React.useState(initialSheetUrl);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState('');

  const syncWithGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setSyncError('Please enter a Google Sheet URL');
      return;
    }
    setIsSyncing(true);
    setSyncError('');
    try {
      const fetchedModules = await fetchModulesFromSheet(sheetUrl);
      if (fetchedModules.length > 0) {
        setModules(fetchedModules);
        alert(`Successfully synced ${fetchedModules.length} modules!`);
      } else {
        setSyncError('No modules found in the provided sheet.');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to sync with Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  return { sheetUrl, setSheetUrl, isSyncing, syncError, syncWithGoogleSheet };
}
