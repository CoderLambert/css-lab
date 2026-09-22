import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { resolve } from "node:path";

const lessonContractPlugin = resolve(
  process.cwd(),
  "scripts/mdx/remark-lesson-contract.mjs",
);

const withMDX = createMDX({
  options: {
    remarkPlugins: [lessonContractPlugin],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

export default withMDX(nextConfig);
