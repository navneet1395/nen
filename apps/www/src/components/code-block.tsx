"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A code block with a copy button. Used to override MDX `pre`, and reusable
 * directly on marketing pages. Reads the rendered text from the DOM so it works
 * regardless of how children are structured.
 */
export function CodeBlock({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group relative not-prose my-6">
      <pre
        ref={ref}
        className={
          "overflow-x-auto rounded-xl border border-border bg-[var(--code-bg)] p-4 pr-12 font-mono text-[13px] leading-relaxed text-foreground/70 shadow-lg " +
          (className ?? "")
        }
        {...props}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground/80 opacity-0 transition-all hover:border-primary/30 hover:text-primary group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
