// Email parsing utilities for job application status detection

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
}

export interface ParsedEmail {
  email: EmailMessage;
  detectedStatus: "Interview" | "Rejected" | "Offer" | "Assessment" | null;
  companyName: string | null;
  confidence: number;
}

// Job platform domains to search for
export const JOB_PLATFORM_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "workday.com",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "icims.com",
  "jobvite.com",
  "smartrecruiters.com",
  "taleo.net",
  "brassring.com",
  "ultipro.com",
  "successfactors.com",
  "linkedin.com",
  "indeed.com",
];

// Keywords for status detection
const STATUS_KEYWORDS = {
  Interview: [
    "schedule interview",
    "interview invitation",
    "phone screen",
    "technical interview",
    "onsite interview",
    "virtual interview",
    "video interview",
    "interview request",
    "would like to schedule",
    "next steps in the interview",
    "move forward with an interview",
    "invite you to interview",
    "discuss your application",
    "speak with you",
    "meet with our team",
  ],
  Rejected: [
    "unfortunately",
    "regret to inform",
    "not moving forward",
    "other candidates",
    "decided not to proceed",
    "will not be moving forward",
    "not a fit",
    "position has been filled",
    "pursue other candidates",
    "not selected",
    "after careful consideration",
    "decided to move forward with",
    "not the right match",
    "competitive applicant pool",
  ],
  Offer: [
    "offer letter",
    "pleased to offer",
    "congratulations",
    "extend an offer",
    "job offer",
    "offer of employment",
    "welcome to the team",
    "excited to have you join",
    "start date",
    "compensation package",
  ],
  Assessment: [
    "coding challenge",
    "take-home",
    "assessment",
    "technical test",
    "skills test",
    "online test",
    "complete the following",
    "hackerrank",
    "codility",
    "codesignal",
    "leetcode",
  ],
};

// Build Gmail search query
export function buildGmailSearchQuery(daysBack: number = 14): string {
  const domainQueries = JOB_PLATFORM_DOMAINS.map((d) => `from:${d}`).join(
    " OR ",
  );
  return `(${domainQueries} OR subject:(application OR interview OR offer)) newer_than:${daysBack}d`;
}

// Detect status from email content
export function detectStatus(
  subject: string,
  snippet: string,
  body?: string,
): {
  status: "Interview" | "Rejected" | "Offer" | "Assessment" | null;
  confidence: number;
} {
  const content = `${subject} ${snippet} ${body || ""}`.toLowerCase();

  // Check each status type
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        // Higher confidence for exact matches in subject
        const confidence = subject.toLowerCase().includes(keyword.toLowerCase())
          ? 0.9
          : 0.7;
        return {
          status: status as "Interview" | "Rejected" | "Offer" | "Assessment",
          confidence,
        };
      }
    }
  }

  return { status: null, confidence: 0 };
}

// Extract company name from email
export function extractCompanyName(
  from: string,
  subject: string,
): string | null {
  // Try to extract from "From" field
  // Format: "Company Name <email@company.com>" or "Name from Company <email>"

  // Check for company name in angle brackets format
  const fromMatch = from.match(/^(.+?)\s*</);
  if (fromMatch) {
    const name = fromMatch[1].trim();
    // Remove common prefixes like "Recruiting", "Talent", "HR"
    const cleanName = name
      .replace(/^(Recruiting|Talent|HR|Careers|Jobs)\s*(at|@|-|from)?\s*/i, "")
      .replace(/\s*(Recruiting|Talent Acquisition|HR|Careers|Jobs)$/i, "")
      .trim();
    if (cleanName && cleanName.length > 1) {
      return cleanName;
    }
  }

  // Try to extract domain from email
  const emailMatch = from.match(/@([a-zA-Z0-9-]+)\./);
  if (emailMatch) {
    const domain = emailMatch[1];
    // Skip generic domains
    if (
      ![
        "gmail",
        "yahoo",
        "outlook",
        "hotmail",
        "greenhouse",
        "lever",
        "workday",
      ].includes(domain.toLowerCase())
    ) {
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  // Try to find company name in subject
  const subjectMatch = subject.match(
    /(?:at|from|with)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s*[-–—]|\s+for|\s+regarding|$)/i,
  );
  if (subjectMatch) {
    return subjectMatch[1].trim();
  }

  return null;
}

// Fuzzy string matching for company names
export function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple Levenshtein-based similarity
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Parse email and extract status info
export function parseEmail(email: EmailMessage): ParsedEmail {
  const { status, confidence } = detectStatus(
    email.subject,
    email.snippet,
    email.body,
  );
  const companyName = extractCompanyName(email.from, email.subject);

  return {
    email,
    detectedStatus: status,
    companyName,
    confidence,
  };
}
