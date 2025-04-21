// scripts/minify.js
const fs = require("fs");
const path = require("path");
const UglifyJS = require("uglify-js");

const targetFile = "./src/three/index.js";
const backupFile = "./src/three/index.original.js";

// 1. 备份原始文件
fs.copyFileSync(targetFile, backupFile);

// 2. 压缩代码
const code = fs.readFileSync(targetFile, "utf8");
const result = UglifyJS.minify(code);

if (result.error) {
  console.error("❌ 压缩失败:", result.error);
  process.exit(1);
}

// 3. 写入压缩后的代码
fs.writeFileSync(targetFile, result.code);
console.log("✅ 已生成压缩版本用于提交");
