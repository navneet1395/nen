import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({
  options: {
    // String form is required so Turbopack can resolve the plugin in its
    // separate process. remark-gfm enables tables, strikethrough, task lists.
    remarkPlugins: [["remark-gfm"]],
  },
});

export default withMDX(nextConfig);
