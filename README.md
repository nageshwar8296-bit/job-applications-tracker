# Job Application Tracker

> A Raycast extension that logs job applications to Notion with one keyboard shortcut. AI-powered extraction, zero manual typing.

![Raycast](https://img.shields.io/badge/Raycast-Extension-FF6363?style=flat-square&logo=raycast)
![Notion](https://img.shields.io/badge/Notion-API-000000?style=flat-square&logo=notion)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Demo

<!-- Add your demo GIF here -->
<!-- ![Demo](assets/demo.gif) -->

**Coming soon** 

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
- **Email Status Sync** — Automatically sync rejection/interview status from Gmail to Notion

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
| Sync Application Status from Email | — | Sync rejection status from Gmail |

### Workflow

1. Browse to any job posting
2. Press `Cmd + Shift + J`
3. Review auto-filled details (edit if needed)
4. Select resume from dropdown
5. Press Enter
6. ✅ Logged to Notion

---

## Email Status Sync

Automatically sync rejection emails to update your Notion applications.

### How It Works

1. Move rejection emails to a Gmail "Rejected" label
2. Run "Sync Application Status from Email" in Raycast
3. Review matched applications
4. Click "Update All" to update Notion

The sync checks applications with **Applied**, **Interview**, or **Offer** status and updates them to "Rejected" if a matching email is found.

### Setup

#### 1. Apple Mail Setup
Add your Gmail account to Apple Mail and ensure it syncs properly.

#### 2. Gmail Label & Filter Setup

**Create the label:**
1. In Gmail, click the **+** next to "Labels" in the sidebar
2. Name it `Rejected`

**Create auto-filter for rejections:**
1. Go to **Gmail Settings** (gear icon) → **See all settings**
2. Go to **Filters and Blocked Addresses** tab
3. Click **Create a new filter**
4. In **"Has the words"** field, paste:
   ```
   "unfortunately" OR "not moving forward" OR "decided not to" OR "pursue other candidate" OR "position has been filled" OR "will not be moving forward" OR "regret to inform" OR "decided to pursue other"
   ```
5. Click **Create filter**
6. Check:
   - ✅ **Apply the label:** → Select "Rejected"
   - ✅ **Also apply filter to matching conversations**
7. Click **Create filter**

Now rejection emails are automatically labeled and will sync to Notion.

#### 3. Apple Shortcut Setup
Create a shortcut named **"Check Job Emails"** with these actions:

**Action 1: Run AppleScript**
```applescript
on run {input, parameters}
    tell application "Mail"
        set jsonArray to "["
        set isFirst to true

        set googleAccount to account "Google"
        set rejectFolder to mailbox "Rejected" of googleAccount
        set allMessages to messages of rejectFolder

        repeat with msg in allMessages
            set msgSubject to subject of msg
            set msgSender to sender of msg

            set companyName to my extractCompany(msgSubject, msgSender)

            if companyName is not "" then
                set companyName to my replaceText(companyName, "\"", "'")

                if not isFirst then
                    set jsonArray to jsonArray & ","
                end if
                set isFirst to false

                set jsonArray to jsonArray & "{\"company\":\"" & companyName & "\",\"status\":\"Rejected\"}"
            end if
        end repeat

        set jsonArray to jsonArray & "]"
        return jsonArray
    end tell
end run

on extractCompany(subj, sender)
    if subj contains " at " then
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to " at "
        set parts to text items of subj
        set AppleScript's text item delimiters to oldDelims
        if (count of parts) > 1 then
            set companyPart to item 2 of parts
            set AppleScript's text item delimiters to " sent"
            set companyPart to item 1 of text items of companyPart
            set AppleScript's text item delimiters to oldDelims
            return companyPart
        end if
    end if

    if sender contains "<" then
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "<"
        set senderName to item 1 of text items of sender
        set AppleScript's text item delimiters to oldDelims
        return my trimText(senderName)
    end if

    return sender
end extractCompany

on replaceText(theText, searchStr, replaceStr)
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to searchStr
    set theItems to text items of theText
    set AppleScript's text item delimiters to replaceStr
    set theText to theItems as text
    set AppleScript's text item delimiters to oldDelims
    return theText
end replaceText

on trimText(theText)
    repeat while theText starts with " "
        set theText to text 2 thru -1 of theText
    end repeat
    repeat while theText ends with " "
        set theText to text 1 thru -2 of theText
    end repeat
    return theText
end trimText
```

**Action 2: Copy to Clipboard**
Add "Copy to Clipboard" action with the AppleScript result.

### Automation

Set up automatic daily sync:

1. Open **Shortcuts** app → **Automation** tab
2. Create new automation with **Time of Day** trigger
3. Add **Run Shell Script** action:
   ```bash
   open "raycast://extensions/nageshwar/job-tracker/sync-email-status"
   ```
4. Turn off "Ask Before Running" for automatic execution
5. Save the automation

Now the sync runs daily at your set time, showing a confirmation dialog before updating.

---

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
# job-applications-tracker
