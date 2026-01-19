# Job Application Tracker

> A Raycast extension that logs job applications to Notion with one keyboard shortcut. AI-powered extraction, zero manual typing.

![Raycast](https://img.shields.io/badge/Raycast-Extension-FF6363?style=flat-square&logo=raycast)
![Notion](https://img.shields.io/badge/Notion-API-000000?style=flat-square&logo=notion)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Demo

<!-- Add your demo GIF here -->
<!-- ![Demo](assets/demo.gif) -->

**Coming soon** - Record a quick demo showing the workflow in action.

## The Problem

Job hunting means applying to dozens (or hundreds) of positions. Tracking each application manually is tedious:
- Copy company name
- Copy job title
- Note the source
- Record the date
- Remember which resume you used

Most people give up on tracking after a few applications.

## The Solution

Press `Cmd + Shift + J` → Done.

The extension:
1. Grabs the job posting URL from your browser
2. Uses AI (ChatGPT via macOS Shortcuts) to extract company, role, location, timezone
3. Auto-detects the source (LinkedIn, Indeed, Glassdoor, etc.)
4. Lets you select which resume you're using
5. Logs everything to Notion with one click

## Features

- **AI-powered extraction** — Automatically parses company, role, location, timezone from any job posting
- **Source detection** — Identifies 15+ job boards automatically
- **Resume management** — Select from existing resumes or drop new ones
- **Auto-refresh** — Detects when you navigate to a new job posting
- **One-click logging** — Everything saved to Notion instantly
- **Offline resumes** — All resumes stored locally, no cloud upload needed

## Requirements

- macOS
- [Raycast](https://raycast.com/) (free)
- [Notion](https://notion.so/) account (free)
- macOS Shortcuts app with ChatGPT action

## Setup

### 1. Create Notion Database

Create a database with these properties:

| Property | Type |
|----------|------|
| Company | Title |
| Role | Text |
| Location | Text |
| Date Applied | Date |
| Day | Text |
| Status | Select (Applied, Interview, Rejected, Offer) |
| Source | Text |
| Resume | Text |

### 2. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Copy the token

### 3. Connect Integration to Database

Open your database → Click `...` → **Connections** → Add your integration

### 4. Get Database ID

From your database URL:
```
https://notion.so/workspace/abc123def456...?v=...
                          ^^^^^^^^^^^^^^^^
                          This is your Database ID
```

### 5. Create macOS Shortcut

Create a shortcut named **"Parse Job"** with these steps:

1. **Run AppleScript** — Get browser URL:
   ```applescript
   on run {input, parameters}
       tell application "Safari"  -- or Chrome, Arc, etc.
           return URL of current tab of front window
       end tell
   end run
   ```

2. **Ask ChatGPT** — Extract job details:
   ```
   From this job posting extract only:
   Role:
   Company:
   Location:
   Timezone:

   Job Posting URL: [URL from previous step]. No explanations. No citations. Nothing else.
   ```

3. **Copy to Clipboard** — Copy the ChatGPT response

### 6. Create Resume Folder

```bash
mkdir -p ~/Documents/Resumes
```

Add your resume PDFs to this folder.

### 7. Install Extension

```bash
git clone https://github.com/YOUR_USERNAME/job-tracker-raycast.git
cd job-tracker-raycast
npm install
npm run dev
```

### 8. Configure Extension

Open Raycast → Search "Log Job Application" → Press `Cmd + ,` to configure:

| Setting | Description |
|---------|-------------|
| Notion API Token | Your integration token |
| Notion Database ID | The ID from your database URL |
| Notion Database URL | (Optional) Full URL for quick access |
| Resume Folder | Path to resumes (e.g., `~/Documents/Resumes`) |

## Usage

| Command | Shortcut | Description |
|---------|----------|-------------|
| Log Job Application | `Cmd + Shift + J` | Capture & log current tab |
| View Applications | — | Open Notion database |

### Workflow

1. Browse to any job posting
2. Press `Cmd + Shift + J`
3. Review auto-filled details (edit if needed)
4. Select resume from dropdown
5. Press Enter
6. ✅ Logged to Notion

## Supported Job Boards

Automatically detects:
- LinkedIn
- Indeed
- Glassdoor
- Greenhouse
- Lever
- Workday
- Wellfound (AngelList)
- Jobright
- Handshake
- ZipRecruiter
- Dice
- SimplyHired
- Monster
- Company career sites

## Browser Support

Default: Comet browser. To use a different browser, modify the AppleScript in:
- `src/log-application.tsx` — `getBrowserUrl()` function
- Your macOS Shortcut

**Safari:**
```applescript
tell application "Safari" to return URL of current tab of front window
```

**Chrome:**
```applescript
tell application "Google Chrome" to return URL of active tab of front window
```

**Arc:**
```applescript
tell application "Arc" to return URL of active tab of front window
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not get browser URL" | Ensure your browser is open. Check AppleScript syntax for your browser. |
| "Failed to log application" | Verify Notion token, database connection, and property names match exactly. |
| No resumes showing | Set Resume Folder path in extension preferences. |
| AI parsing fails | Ensure "Parse Job" shortcut exists in macOS Shortcuts app. |
| Extension closes when clicking outside | This is default Raycast behavior. Use the file picker dialog instead of drag & drop. |

## Tech Stack

- [Raycast Extension API](https://developers.raycast.com/)
- [Notion API](https://developers.notion.com/)
- macOS Shortcuts + ChatGPT
- AppleScript
- TypeScript / React

## Contributing

Contributions welcome! Feel free to:
- Add support for more job boards
- Add browser presets
- Improve AI extraction prompts
- Fix bugs

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built for the job hunt. One click at a time.**

If this helped you, consider giving it a ⭐
