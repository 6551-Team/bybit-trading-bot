import { runBot } from "./bot/runner.js";

runBot().catch((e) => {
  console.error(e);
  process.exit(1);
});
