"use client";

export interface ReportSection {
  label: string;
  href: string;
}

const DEFAULT_SECTION: ReportSection = {
  label: "Deep Dives",
  href: "/deep-dive",
};

export function resolveReportSection(path?: string): ReportSection {
  if (!path) return DEFAULT_SECTION;

  if (path.startsWith("/biz-miner")) {
    return { label: "Biz Miner", href: "/biz-miner" };
  }

  if (path.startsWith("/sales-miner")) {
    return { label: "Sales Miner", href: "/sales-miner" };
  }

  if (path.startsWith("/vitelis-sales")) {
    return { label: "Vitelis Sales", href: "/vitelis-sales" };
  }

  return DEFAULT_SECTION;
}

export function buildReportHref(path: string | undefined, reportId: number): string {
  return `${resolveReportSection(path).href}/${reportId}`;
}

export function buildCompanyHref(
  path: string | undefined,
  reportId: number,
  companyId: number,
): string {
  return `${buildReportHref(path, reportId)}/companies/${companyId}`;
}

export function buildQueryHref(
  path: string | undefined,
  reportId: number,
  queryId: number | string,
): string {
  return `${buildReportHref(path, reportId)}/query?queryId=${queryId}`;
}
