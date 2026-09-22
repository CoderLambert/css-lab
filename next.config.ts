import createMDX from "@next/mdx";
import type { NextConfig } from "next";

import { remarkLessonContract } from "./scripts/mdx/remark-lesson-contract.mjs";

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkLessonContract],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

export default withMDX(nextConfig);
