"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownCellProps {
  children: string | null | undefined;
  maxHeight?: number;
  extended?: boolean;
}

export function MarkdownCell({ children, maxHeight = 200, extended }: MarkdownCellProps) {
  if (!children) return <span style={{ color: "#595959" }}>—</span>;
  return (
    <div style={{ maxHeight, overflow: "auto", color: "#d9d9d9" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: c }) => <p style={{ margin: "0 0 4px" }}>{c}</p>,
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#58bfce" }}>{c}</a>
          ),
          ...(extended ? {
            ul: ({ children: c }) => <ul style={{ margin: "0 0 4px", paddingLeft: 16 }}>{c}</ul>,
            ol: ({ children: c }) => <ol style={{ margin: "0 0 4px", paddingLeft: 16 }}>{c}</ol>,
            table: ({ children: c }) => (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, margin: "4px 0" }}>{c}</table>
            ),
            th: ({ children: c }) => (
              <th style={{ border: "1px solid #303030", padding: "4px 8px", background: "#1a1a1a", color: "#d9d9d9", textAlign: "left" }}>{c}</th>
            ),
            td: ({ children: c }) => (
              <td style={{ border: "1px solid #303030", padding: "4px 8px", color: "#d9d9d9" }}>{c}</td>
            ),
          } : {}),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function SourcesCell({ sources }: { sources: string[] }) {
  if (!sources.length) return <span style={{ color: "#595959" }}>—</span>;
  const md = sources
    .map((s, index) => {
      if (s.startsWith("http")) {
        try {
          return `${index + 1}. [${s}](${s})`;
        } catch {
          return `${index + 1}. ${s}`;
        }
      }
      return `${index + 1}. ${s}`;
    })
    .join("\n");
  return <MarkdownCell extended>{md}</MarkdownCell>;
}
