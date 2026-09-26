export type DocPage = {
  id: string;
  title: string;
  description: string;
  group: string;
  markdown: string;
  sourceUrl: string;
};

const content = import.meta.glob<string>("../content/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const sourceUrls = import.meta.glob<string>("../content/*.md", {
  eager: true,
  query: "?url",
  import: "default",
});

const navigation = [
  {
    id: "overview",
    title: "Overview",
    description: "Product direction and a working canvas preview.",
    group: "Start here",
  },
  {
    id: "concepts",
    title: "Core concepts",
    description: "Workflows, stages, agents, actions, and runs.",
    group: "Start here",
  },
  {
    id: "workflows",
    title: "Define a workflow",
    description: "Definitions, execution, and parallel eligibility.",
    group: "System design",
  },
  {
    id: "agents-actions",
    title: "Agents & actions",
    description: "Add reusable agents, prompts, and scripts.",
    group: "System design",
  },
  {
    id: "routing-loops",
    title: "Routing & loops",
    description: "Typed outcomes and bounded repetition.",
    group: "System design",
  },
  {
    id: "triggers",
    title: "Triggers & schedules",
    description: "Manual starts, cron, and occurrence identity.",
    group: "System design",
  },
  {
    id: "react-flow",
    title: "How React Flow works",
    description: "An interactive graph powered by nodes, edges, and run state.",
    group: "Build & observe",
  },
  {
    id: "traces",
    title: "Runs & traces",
    description: "Understand events, evidence, and recovery.",
    group: "Build & observe",
  },
  {
    id: "pi-integration",
    title: "Pi & persistence",
    description: "Reuse Pi and Pi durable through narrow adapters.",
    group: "Build & observe",
  },
  {
    id: "decisions",
    title: "Decisions & delivery",
    description: "Agreed scope, milestones, and teammate discussion.",
    group: "Team reference",
  },
];

export const documents: DocPage[] = navigation.map((item) => {
  const path = `../content/${item.id}.md`;
  const markdown = content[path];
  const sourceUrl = sourceUrls[path];
  if (!markdown || !sourceUrl)
    throw new Error(`Missing Markdown page: ${item.id}`);
  return { ...item, markdown, sourceUrl };
});

/** Converts a plain heading into a stable document anchor. */
export function headingId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Reads second-level headings while excluding fenced code examples. */
export function headingsFor(markdown: string): { title: string; id: string }[] {
  let fenced = false;
  const headings: { title: string; id: string }[] = [];
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    if (!fenced && line.startsWith("## ")) {
      const title = line.slice(3).trim();
      headings.push({ title, id: headingId(title) });
    }
  }
  return headings;
}

/** Resolves local Markdown links to static documentation page URLs. */
export function documentHref(href: string): string {
  const match = href.match(/^([a-z0-9-]+)\.md(#[a-z0-9-]+)?$/);
  return match ? `?doc=${match[1]}${match[2] ?? ""}` : href;
}
