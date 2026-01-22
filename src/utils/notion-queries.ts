import { Client } from "@notionhq/client";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string;
}

// Query all applications with status "Applied", "Interview", or "Offer"
export async function queryApplications(
  notion: Client,
  databaseId: string,
): Promise<JobApplication[]> {
  const applications: JobApplication[] = [];

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        or: [
          {
            property: "Status",
            select: { equals: "Applied" },
          },
          {
            property: "Status",
            select: { equals: "Interview" },
          },
          {
            property: "Status",
            select: { equals: "Offer" },
          },
        ],
      },
      start_cursor: startCursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if ("properties" in page) {
        const props = page.properties;

        // Extract company name
        let company = "";
        if ("Company" in props && props.Company.type === "title") {
          company = props.Company.title.map((t) => t.plain_text).join("");
        }

        // Extract role
        let role = "";
        if ("Role" in props && props.Role.type === "rich_text") {
          role = props.Role.rich_text.map((t) => t.plain_text).join("");
        }

        // Extract status
        let status = "";
        if (
          "Status" in props &&
          props.Status.type === "select" &&
          props.Status.select
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status = (props.Status.select as any).name || "";
        }

        // Extract date applied
        let dateApplied = "";
        if (
          "Date Applied" in props &&
          props["Date Applied"].type === "date" &&
          props["Date Applied"].date
        ) {
          dateApplied = props["Date Applied"].date.start;
        }

        applications.push({
          id: page.id,
          company,
          role,
          status,
          dateApplied,
        });
      }
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  return applications;
}

// Update application status
export async function updateApplicationStatus(
  notion: Client,
  pageId: string,
  newStatus: string,
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        select: {
          name: newStatus,
        },
      },
    },
  });
}

// Find matching application by company name
export function findMatchingApplication(
  applications: JobApplication[],
  companyName: string,
  fuzzyMatch: (a: string, b: string) => number,
  threshold: number = 0.7,
): JobApplication | null {
  let bestMatch: JobApplication | null = null;
  let bestScore = 0;

  for (const app of applications) {
    const score = fuzzyMatch(app.company, companyName);
    if (score > threshold && score > bestScore) {
      bestScore = score;
      bestMatch = app;
    }
  }

  return bestMatch;
}
