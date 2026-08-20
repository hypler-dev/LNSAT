/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  transpilePackages: ["@lnsat/packets", "@lnsat/policy", "@lnsat/audit"],
};

export default nextConfig;
