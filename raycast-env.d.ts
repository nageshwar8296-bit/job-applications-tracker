/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Notion API Token - Your Notion integration token (starts with ntn_ or secret_) */
  "notionToken": string,
  /** Notion Database ID - The ID of your Job Applications database */
  "databaseId": string,
  /** Notion Database URL - Full URL to your Notion database (for quick access) */
  "notionDatabaseUrl"?: string,
  /** Resume Folder - Path to folder containing your resumes (e.g., ~/Documents/Resumes) */
  "resumeFolder"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `log-application` command */
  export type LogApplication = ExtensionPreferences & {}
  /** Preferences accessible in the `view-applications` command */
  export type ViewApplications = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `log-application` command */
  export type LogApplication = {}
  /** Arguments passed to the `view-applications` command */
  export type ViewApplications = {}
}

