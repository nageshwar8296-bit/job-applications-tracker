-- Check Job Emails AppleScript (with ChatGPT parsing)
-- This version collects raw email data for ChatGPT to parse.
-- Use this if the basic version isn't extracting company names correctly.
--
-- SETUP:
-- 1. Open Shortcuts app
-- 2. Create new shortcut named "Check Job Emails"
-- 3. Add "Run AppleScript" action and paste this script
-- 4. Add "Ask ChatGPT" action with the prompt below
-- 5. Add "Copy to Clipboard" action
--
-- ChatGPT PROMPT:
-- Analyze these emails and extract ONLY job application rejections.
--
-- RULES:
-- 1. IGNORE non-job emails (Temu, newsletters, promotional, etc.)
-- 2. Extract company name from subject line or sender's email domain
-- 3. Only include actual job rejections
--
-- Return ONLY valid JSON: [{"company": "Company Name", "status": "Rejected"}]
-- If no job rejections found, return: []
--
-- Emails:

on run {input, parameters}
    tell application "Mail"
        set emailList to ""
        set cutoffDate to (current date) - (7 * days)

        set googleAccount to account "Google"
        set rejectFolder to mailbox "Rejected" of googleAccount
        set recentMessages to (messages of rejectFolder whose date received > cutoffDate)

        repeat with msg in recentMessages
            set msgSubject to subject of msg
            set msgSender to sender of msg
            set emailList to emailList & "Subject: " & msgSubject & " | From: " & msgSender & return
        end repeat

        return emailList
    end tell
end run
