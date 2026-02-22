import { readFileSync, mkdirSync } from "fs";
import { build, context } from "esbuild";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
let banner = readFileSync("src/banner.txt", "utf-8").trimEnd();
banner = banner.replace("{{VERSION}}", pkg.version);

const watching = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

const config = {
  entryPoints: ["src/main.js"],
  outfile: "dist/google-accounts.user.js",
  bundle: true,
  format: "iife",
  target: "es2017",
  banner: { js: banner },
};

if (watching) {
  const ctx = await context({
    ...config,
    plugins: [
      {
        name: "log-rebuild",
        setup(build) {
          build.onEnd(() => {
            console.log(`Built → dist/google-accounts.user.js`);
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log("Watching for changes…");
} else {
  await build(config);
  console.log(`Built → dist/google-accounts.user.js`);
}
