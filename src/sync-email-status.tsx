import { showHUD, getPreferenceValues } from "@raycast/api";
import { Client } from "@notionhq/client";
import { runAppleScript } from "run-applescript";
import {
  queryApplications,
  updateApplicationStatus,
  findMatchingApplication,
} from "./utils/notion-queries";
import { fuzzyMatch } from "./utils/email-parser";

interface Preferences {
  notionToken: string;
  databaseId: string;
}

interface EmailStatusUpdate {
  company: string;
  status: "Interview" | "Rejected" | "Offer" | "Assessment";
}

interface PendingUpdate {
  emailUpdate: EmailStatusUpdate;
  applicationId: string;
  applicationCompany: string;
  applicationRole: string;
  newStatus: string;
}

// Call Apple Shortcut "Check Job Emails" and get results from clipboard
async function callCheckEmailsShortcut(): Promise<EmailStatusUpdate[]> {
  const script = `
    set the clipboard to ""
    do shell script "open -g 'shortcuts://run-shortcut?name=Check%20Job%20Emails'"

    -- Poll clipboard every 0.5 seconds until content appears (max 30 seconds)
    set maxAttempts to 60
    set attempt to 0
    repeat while attempt < maxAttempts
      delay 0.5
      set clipContent to the clipboard
      if clipContent is not "" and clipContent contains "company" then
        return clipContent
      end if
      set attempt to attempt + 1
    end repeat

    return the clipboard
  `;

  try {
    const result = await runAppleScript(script);

    if (!result || result.trim() === "") {
      return [];
    }

    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) =>
            item.company &&
            item.status &&
            ["Interview", "Rejected", "Offer", "Assessment"].includes(
              item.status,
            ),
        );
      }
    } catch {
      // Try to parse line-by-line format
      const updates: EmailStatusUpdate[] = [];
      const lines = result.split("\n");

      for (const line of lines) {
        const companyMatch = line.match(/company[:\s]+([^,]+)/i);
        const statusMatch = line.match(
          /status[:\s]+(Interview|Rejected|Offer|Assessment)/i,
        );

        if (companyMatch && statusMatch) {
          updates.push({
            company: companyMatch[1].trim(),
            status: statusMatch[1] as EmailStatusUpdate["status"],
          });
        }
      }

      return updates;
    }

    return [];
  } catch (error) {
    console.error("Shortcut error:", error);
    return [];
  }
}

// Show native macOS confirmation dialog (no Raycast window needed)
async function showNativeConfirm(
  title: string,
  message: string,
): Promise<boolean> {
  const script = `
    display dialog "${message}" with title "${title}" buttons {"Cancel", "Update All"} default button "Update All"
    if button returned of result is "Update All" then
      return "true"
    else
      return "false"
    end if
  `;

  try {
    const result = await runAppleScript(script);
    return result === "true";
  } catch {
    // User clicked Cancel or closed dialog
    return false;
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const notion = new Client({ auth: preferences.notionToken });

  try {
    // Call the shortcut
    const emailUpdates = await callCheckEmailsShortcut();

    if (emailUpdates.length === 0) {
      await showHUD("No status updates found in emails");
      return;
    }

    // Query Notion for applications
    const applications = await queryApplications(
      notion,
      preferences.databaseId,
    );

    if (applications.length === 0) {
      await showHUD("No active applications found");
      return;
    }

    // Match and prepare updates
    const pendingUpdates: PendingUpdate[] = [];
    const unmatchedCompanies: string[] = [];

    for (const update of emailUpdates) {
      const matchingApp = findMatchingApplication(
        applications,
        update.company,
        fuzzyMatch,
        0.6, // Lower threshold for better matching
      );

      if (matchingApp) {
        // Avoid duplicates (same company already in pending updates)
        const alreadyAdded = pendingUpdates.some(
          (p) => p.applicationId === matchingApp.id,
        );
        if (!alreadyAdded) {
          pendingUpdates.push({
            emailUpdate: update,
            applicationId: matchingApp.id,
            applicationCompany: matchingApp.company,
            applicationRole: matchingApp.role,
            newStatus: update.status,
          });
        }
      } else {
        unmatchedCompanies.push(update.company);
      }
    }

    if (pendingUpdates.length === 0) {
      const unmatchedList = unmatchedCompanies.slice(0, 10).join(", ");
      await showHUD(
        `No matches found. Emails: ${emailUpdates.length}, Notion apps: ${applications.length}. Unmatched: ${unmatchedList}`,
      );
      return;
    }

    // Build confirmation message
    const updatesList = pendingUpdates
      .map((u) => `• ${u.applicationCompany} → ${u.newStatus}`)
      .join("\n");

    const statsLine = `\n\n(${pendingUpdates.length} matched, ${unmatchedCompanies.length} unmatched from ${emailUpdates.length} emails)`;

    // Show native macOS confirmation dialog
    const confirmed = await showNativeConfirm(
      `Update ${pendingUpdates.length} Application(s)?`,
      updatesList + statsLine,
    );

    if (!confirmed) {
      await showHUD("Cancelled");
      return;
    }

    // Apply updates
    let successCount = 0;
    const updateDetails: string[] = [];

    for (const update of pendingUpdates) {
      try {
        await updateApplicationStatus(
          notion,
          update.applicationId,
          update.newStatus,
        );
        successCount++;
        updateDetails.push(`${update.applicationCompany}: ${update.newStatus}`);
      } catch (error) {
        console.error(`Failed to update ${update.applicationCompany}:`, error);
      }
    }

    if (successCount > 0) {
      await showHUD(`✅ Updated ${successCount}: ${updateDetails.join(", ")}`);
    } else {
      await showHUD("No updates applied");
    }
  } catch (error) {
    console.error("Sync error:", error);
    await showHUD(
      `❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
