import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  getPreferenceValues,
  showToast,
  Toast,
  popToRoot,
  Icon,
  LocalStorage,
} from "@raycast/api";
import { Client } from "@notionhq/client";
import { runAppleScript } from "run-applescript";
import { useState, useEffect } from "react";
import { readdirSync, existsSync, copyFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

interface Preferences {
  notionToken: string;
  databaseId: string;
  notionDatabaseUrl?: string;
  resumeFolder?: string;
}

interface JobInfo {
  company: string;
  role: string;
  location: string;
  timezone: string;
  source: string;
  url: string;
}

// Get URL from Comet browser
async function getBrowserUrl(): Promise<string> {
  const urlScript = `tell application "Comet" to return URL of active tab of front window`;
  try {
    const url = await runAppleScript(urlScript);
    if (!url || url.trim() === "") {
      throw new Error("No URL found");
    }
    return url.trim();
  } catch {
    throw new Error(
      "Could not get browser URL. Make sure Comet is open with a tab.",
    );
  }
}

import { exec } from "child_process";

// Trigger Apple Shortcut "Parse Job" - runs as separate process
async function triggerParseJobShortcut(): Promise<void> {
  try {
    // Use open command with shortcuts URL scheme - completely separate process
    exec(`open "shortcuts://run-shortcut?name=Parse%20Job"`);
  } catch (error) {
    console.error("Failed to trigger shortcut:", error);
  }
}

// Detect source from URL
function detectSource(url: string): string {
  if (url.includes("linkedin.com")) return "LinkedIn";
  if (url.includes("indeed.com")) return "Indeed";
  if (url.includes("glassdoor.com")) return "Glassdoor";
  if (url.includes("wellfound.com") || url.includes("angel.co"))
    return "Wellfound";
  if (url.includes("lever.co")) return "Lever";
  if (url.includes("greenhouse.io") || url.includes("boards.greenhouse"))
    return "Greenhouse";
  if (url.includes("workday.com") || url.includes("myworkdayjobs.com"))
    return "Workday";
  if (url.includes("jobright.ai")) return "Jobright";
  if (url.includes("handshake")) return "Handshake";
  if (url.includes("ziprecruiter.com")) return "ZipRecruiter";
  if (url.includes("dice.com")) return "Dice";
  if (url.includes("simplyhired.com")) return "SimplyHired";
  if (url.includes("monster.com")) return "Monster";
  if (url.includes("jobs.") || url.includes("careers.")) return "Company Site";
  return "Other";
}

function getResumes(folderPath?: string): string[] {
  if (!folderPath) return [];
  const expandedPath = folderPath.startsWith("~")
    ? folderPath.replace("~", homedir())
    : folderPath;
  if (!existsSync(expandedPath)) return [];
  try {
    const files = readdirSync(expandedPath);
    return files.filter((file) => file.toLowerCase().endsWith(".pdf"));
  } catch {
    return [];
  }
}

// Get expanded resume folder path
function getResumeFolder(folderPath?: string): string {
  if (!folderPath) return join(homedir(), "Documents", "Resumes");
  return folderPath.startsWith("~")
    ? folderPath.replace("~", homedir())
    : folderPath;
}

// Call Apple Shortcut "Parse Job" to get AI-parsed job details
async function callParseJobShortcut(): Promise<{
  role: string;
  company: string;
  location: string;
  timezone: string;
}> {
  // Clear clipboard first, run shortcut, then poll clipboard until it has content
  // We use 'shortcuts run' in background so it doesn't steal focus
  const script = `
    set the clipboard to ""
    do shell script "open -g 'shortcuts://run-shortcut?name=Parse%20Job'"

    -- Poll clipboard every 0.1 seconds until content appears (max 15 seconds)
    set maxAttempts to 150
    set attempt to 0
    repeat while attempt < maxAttempts
      delay 0.1
      set clipContent to the clipboard
      if clipContent is not "" and clipContent contains "Role:" then
        return clipContent
      end if
      set attempt to attempt + 1
    end repeat

    return the clipboard
  `;

  try {
    const result = await runAppleScript(script);
    console.log("Clipboard content from shortcut:", JSON.stringify(result));

    // Parse the ChatGPT response
    // Expected: Role: X \n Company: Y \n Location: Z \n Timezone: T
    const roleMatch = result.match(/Role:\s*(.+?)(?=\s*\n?\s*Company:|$)/is);
    const companyMatch = result.match(
      /Company:\s*(.+?)(?=\s*\n?\s*Location:|$)/is,
    );
    const locationMatch = result.match(
      /Location:\s*(.+?)(?=\s*\n?\s*Timezone:|\s*\n?\s*Job Posting URL:|$)/is,
    );
    const timezoneMatch = result.match(
      /Timezone:\s*(.+?)(?=\s*\n?\s*Job Posting URL:|$)/is,
    );

    return {
      role: roleMatch ? roleMatch[1].trim() : "",
      company: companyMatch ? companyMatch[1].trim() : "",
      location: locationMatch ? locationMatch[1].trim() : "",
      timezone: timezoneMatch ? timezoneMatch[1].trim() : "",
    };
  } catch (error) {
    console.error("Shortcut error:", error);
    return { role: "", company: "", location: "", timezone: "" };
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<JobInfo>({
    company: "",
    role: "",
    location: "",
    timezone: "",
    source: "",
    url: "",
  });
  const [resumes, setResumes] = useState<string[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [droppedFile, setDroppedFile] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Function to fetch and parse job data
  async function fetchJobData() {
    setIsLoading(true);
    try {
      // Get browser URL first
      const url = await getBrowserUrl();
      const source = detectSource(url);

      // Show loading message
      await showToast({
        style: Toast.Style.Animated,
        title: "Parsing job with AI...",
      });

      // Call Apple Shortcut for AI parsing
      const { role, company, location, timezone } =
        await callParseJobShortcut();

      setJobInfo({
        company: company || "Unknown Company",
        role: role || "Unknown Role",
        location: location || "",
        timezone: timezone || "",
        source,
        url,
      });

      // Get resumes from folder
      const resumeList = getResumes(preferences.resumeFolder);
      setResumes(resumeList);
      if (resumeList.length > 0) {
        setSelectedResume(resumeList[0]);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Job parsed!",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to get URL",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Load settings and fetch data on mount (when hotkey is pressed)
  useEffect(() => {
    async function init() {
      // Load auto-refresh setting
      const savedAutoRefresh =
        await LocalStorage.getItem<boolean>("autoRefresh");
      const shouldAutoRefresh =
        savedAutoRefresh !== undefined ? savedAutoRefresh : true;
      setAutoRefresh(shouldAutoRefresh);

      try {
        // Get current URL and source
        const url = await getBrowserUrl();
        const source = detectSource(url);

        // Get resumes from folder
        const resumeList = getResumes(preferences.resumeFolder);
        setResumes(resumeList);
        if (resumeList.length > 0) {
          setSelectedResume(resumeList[0]);
        }

        if (shouldAutoRefresh) {
          // Auto-refresh ON: parse with AI
          await showToast({
            style: Toast.Style.Animated,
            title: "Parsing job with AI...",
          });

          const { role, company, location, timezone } =
            await callParseJobShortcut();

          setJobInfo({
            company: company || "Unknown Company",
            role: role || "Unknown Role",
            location: location || "",
            timezone: timezone || "",
            source,
            url,
          });

          await showToast({
            style: Toast.Style.Success,
            title: "Job parsed!",
          });
        } else {
          // Auto-refresh OFF: just set URL and source, keep previous company/role/location
          setJobInfo((prev) => ({
            ...prev,
            source,
            url,
          }));
        }
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to get URL",
        });
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Monitor URL changes - if auto-refresh ON and URL changes, close extension
  useEffect(() => {
    if (!autoRefresh || !jobInfo.url) return;

    const checkUrlChange = async () => {
      try {
        const currentUrl = await getBrowserUrl();
        if (currentUrl !== jobInfo.url) {
          // URL changed, close extension so next hotkey press is fresh
          await popToRoot();
        }
      } catch {
        // Ignore errors
      }
    };

    const interval = setInterval(checkUrlChange, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, jobInfo.url]);

  async function handleSubmit(values: {
    company: string;
    role: string;
    location: string;
    timezone: string;
    resume: string;
    source: string;
    newResume?: string[];
  }) {
    try {
      const resumeFolder = getResumeFolder(preferences.resumeFolder);
      let resumeName = "";

      // Ensure resume folder exists
      if (!existsSync(resumeFolder)) {
        mkdirSync(resumeFolder, { recursive: true });
      }

      if (values.newResume && values.newResume.length > 0) {
        // User dropped a new file
        const droppedPath = values.newResume[0];
        const fileName = basename(droppedPath);
        const destPath = join(resumeFolder, fileName);

        // Copy to resumes folder if it doesn't already exist
        if (!existsSync(destPath)) {
          copyFileSync(droppedPath, destPath);
          await showToast({
            style: Toast.Style.Success,
            title: "Resume copied to folder",
          });
        }

        resumeName = fileName;
      } else if (values.resume) {
        // User selected from existing resumes
        resumeName = values.resume;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Logging to Notion...",
      });

      const notion = new Client({ auth: preferences.notionToken });

      // Get current date info
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

      // Build base properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: any = {
        Company: { title: [{ text: { content: values.company } }] },
        Role: { rich_text: [{ text: { content: values.role } }] },
        "Date Applied": { date: { start: now.toISOString() } },
        Day: { rich_text: [{ text: { content: dayOfWeek } }] },
        Status: { select: { name: "Applied" } },
        Location: {
          rich_text: [
            {
              text: {
                content: values.timezone
                  ? `${values.location} (${values.timezone})`
                  : values.location,
              },
            },
          ],
        },
        Source: {
          rich_text: [
            {
              text: {
                content: values.source,
                link: jobInfo.url ? { url: jobInfo.url } : null,
              },
            },
          ],
        },
      };

      // Add resume filename as text (file:// URLs not supported by Notion)
      if (resumeName) {
        properties.Resume = {
          rich_text: [
            {
              text: {
                content: resumeName,
              },
            },
          ],
        };
      }

      // Log to Notion
      await notion.pages.create({
        parent: { database_id: preferences.databaseId },
        properties,
      });

      await showHUD(`✅ Logged!`);

      // Trigger the shortcut - it runs as separate process and updates clipboard
      await triggerParseJobShortcut();

      await popToRoot();
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to log application",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Application" onSubmit={handleSubmit} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchJobData}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="company"
        title="Company"
        placeholder="Company name"
        value={jobInfo.company}
        onChange={(value) => setJobInfo({ ...jobInfo, company: value })}
      />
      <Form.Checkbox
        id="autoRefresh"
        label="Auto-refresh on open"
        value={autoRefresh}
        onChange={async (value) => {
          setAutoRefresh(value);
          await LocalStorage.setItem("autoRefresh", value);
        }}
      />
      <Form.TextField
        id="role"
        title="Role"
        placeholder="Job title"
        value={jobInfo.role}
        onChange={(value) => setJobInfo({ ...jobInfo, role: value })}
      />
      <Form.TextField
        id="location"
        title="Location"
        placeholder="City, State, Country"
        value={jobInfo.location}
        onChange={(value) => setJobInfo({ ...jobInfo, location: value })}
      />
      <Form.TextField
        id="timezone"
        title="Timezone"
        placeholder="e.g. CST, PST, GMT+1"
        value={jobInfo.timezone}
        onChange={(value) => setJobInfo({ ...jobInfo, timezone: value })}
      />
      <Form.Separator />
      <Form.FilePicker
        id="newResume"
        title="Drop Resume"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={droppedFile}
        onChange={setDroppedFile}
      />
      {resumes.length > 0 && (
        <Form.Dropdown
          id="resume"
          title="Or Select Existing"
          value={selectedResume}
          onChange={setSelectedResume}
        >
          <Form.Dropdown.Item value="" title="None" />
          {resumes.map((resume) => (
            <Form.Dropdown.Item key={resume} value={resume} title={resume} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Dropdown
        id="source"
        title="Source"
        value={jobInfo.source}
        onChange={(value) => setJobInfo({ ...jobInfo, source: value })}
      >
        <Form.Dropdown.Section title="Auto-Detected">
          <Form.Dropdown.Item value={jobInfo.source} title={jobInfo.source} />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Job Boards">
          <Form.Dropdown.Item value="LinkedIn" title="LinkedIn" />
          <Form.Dropdown.Item value="Indeed" title="Indeed" />
          <Form.Dropdown.Item value="Glassdoor" title="Glassdoor" />
          <Form.Dropdown.Item value="Wellfound" title="Wellfound" />
          <Form.Dropdown.Item value="Greenhouse" title="Greenhouse" />
          <Form.Dropdown.Item value="Lever" title="Lever" />
          <Form.Dropdown.Item value="Workday" title="Workday" />
          <Form.Dropdown.Item value="Jobright" title="Jobright" />
          <Form.Dropdown.Item value="Handshake" title="Handshake" />
          <Form.Dropdown.Item value="ZipRecruiter" title="ZipRecruiter" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Other">
          <Form.Dropdown.Item value="Company Site" title="Company Site" />
          <Form.Dropdown.Item value="Referral" title="Referral" />
          <Form.Dropdown.Item value="Dice" title="Dice" />
          <Form.Dropdown.Item value="Monster" title="Monster" />
          <Form.Dropdown.Item value="SimplyHired" title="SimplyHired" />
          <Form.Dropdown.Item value="Other" title="Other" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="URL" text={jobInfo.url || "Loading..."} />
    </Form>
  );
}
