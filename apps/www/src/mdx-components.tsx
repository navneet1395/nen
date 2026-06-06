import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,

    // Code blocks get a copy button + dark surface.
    pre: (props) => <CodeBlock {...props} />,

    // Tables: remark-gfm parses them; these styles make them clearly visible
    // (the default prose borders were near-invisible in this theme).
    table: (props) => (
      <div className="not-prose my-6 w-full overflow-x-auto rounded-xl border border-border/70 shadow-sm">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    thead: (props) => <thead className="bg-muted/60" {...props} />,
    th: (props) => (
      <th
        className="border-b border-border/70 px-4 py-2.5 text-left font-semibold text-foreground"
        {...props}
      />
    ),
    td: (props) => (
      <td
        className="border-b border-border/40 px-4 py-2.5 align-top text-muted-foreground [&_code]:text-primary"
        {...props}
      />
    ),
    tr: (props) => <tr className="transition-colors hover:bg-muted/30" {...props} />,

    a: ({ href = "#", ...props }) => (
      <Link
        href={href}
        className="font-medium text-primary underline-offset-2 hover:underline"
        {...props}
      />
    ),
  };
}
