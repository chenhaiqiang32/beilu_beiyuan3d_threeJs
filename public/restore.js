// scripts/restore.js
const fs = require("fs");

const targetFile = "./src/three/index.js";
const backupFile = "./src/three/index.original.js";

if (fs.existsSync(backupFile)) {
  // 恢复原始文件
  fs.copyFileSync(backupFile, targetFile);
  fs.unlinkSync(backupFile);
  console.log("✅ 已恢复本地原始文件");
}
