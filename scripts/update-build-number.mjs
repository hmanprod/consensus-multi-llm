import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const count = Number(execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim()) + 1;
writeFileSync(resolve("build-number.txt"), `${count}\n`);