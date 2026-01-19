import { showHUD, getPreferenceValues, open } from "@raycast/api";

interface Preferences {
  notionToken: string;
  databaseId: string;
  notionDatabaseUrl?: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Use notion:// protocol to open in Notion app
  const url = `notion://notion.so/${preferences.databaseId}`;
  
  await open(url);
  await showHUD("📋 Opening Job Tracker...");
}
