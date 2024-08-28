// tsup.config.ts
import { defineConfig } from "tsup";
var DEFAULT_CONFIG = {
  bundle: true,
  clean: true,
  // clean up the dist folder
  dts: true,
  // generate dts files
  minify: false,
  entry: ["src/index.ts"],
  // include all files under src
  skipNodeModulesBundle: true,
  sourcemap: true,
  splitting: true,
  target: "es2020"
};
var ESM_CONFIG = {
  ...DEFAULT_CONFIG,
  bundle: true,
  entry: ["src/**/*.ts"],
  format: "esm",
  outDir: "dist/esm",
  platform: "node"
};
var tsup_config_default = defineConfig([ESM_CONFIG]);
export {
  tsup_config_default as default
};
//# sourceMappingURL=tsup.config.js.map