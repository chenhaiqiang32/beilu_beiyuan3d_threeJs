import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const config = {};
let v = "1.0.0",
  r = "1.0.0";

if (process.env.npm_config_argv != undefined) {
  const argv = JSON.parse(process.env.npm_config_argv);
  // 获取自定义参数
  let idx = 2;
  const cooked = argv.cooked;
  const length = argv.cooked.length;
  while ((idx += 2) <= length) {
    config[cooked[idx - 2]] = cooked[idx - 1];
  }

  v = config["--V"];
  if (v == "undefined") {
    v = "1.0.0";
  }
  r = config["--R"];
  if (r == "undefined") {
    r = "1.0.0";
  }
}

const fileName = fileURLToPath(import.meta.url);
const _dirname = path.dirname(fileName);

// https://vitejs.dev/config/
export default defineConfig({
  base: "./", //公共路径配置
  outputDir: "projectNameV" + v + "R" + r,
  resolve: {
    alias: {
      "@": path.resolve(_dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
  },
  build: {
    manifest: false,
    sourcemap: false, // 构建后是否生成 source map 文件。如果为 true，将会创建一个独立的 source map 文件
    outDir: "docker/nginx/dist",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
  plugins: [],
});
