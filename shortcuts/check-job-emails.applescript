-- Check Job Emails AppleScript
-- This script reads rejection emails from your Gmail "Rejected" folder
-- and returns them as JSON for the Raycast extension to process.
--
-- SETUP:
-- 1. Open Shortcuts app
-- 2. Create new shortcut named "Check Job Emails"
-- 3. Add "Run AppleScript" action and paste this entire script
-- 4. Add "Copy to Clipboard" action after the AppleScript
-- 5. Save the shortcut

on run {input, parameters}
    tell application "Mail"
        set jsonArray to "["
        set isFirst to true
        set cutoffDate to (current date) - (7 * days)

        set googleAccount to account "Google"
        set rejectFolder to mailbox "Rejected" of googleAccount
        set recentMessages to (messages of rejectFolder whose date received > cutoffDate)

        repeat with msg in recentMessages
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
    -- Try to extract company from "at CompanyName" pattern in subject
    if subj contains " at " then
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to " at "
        set parts to text items of subj
        set AppleScript's text item delimiters to oldDelims
        if (count of parts) > 1 then
            set companyPart to item 2 of parts
            -- Remove trailing " sent" if present
            set AppleScript's text item delimiters to " sent"
            set companyPart to item 1 of text items of companyPart
            set AppleScript's text item delimiters to oldDelims
            return companyPart
        end if
    end if

    -- Fallback: extract sender name (before the email address)
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
