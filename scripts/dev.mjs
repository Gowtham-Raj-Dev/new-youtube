// `npm run dev`: the web app plus the PC helper that cuts videos into Shorts.
import { spawn } from "node:child_process";

const children = [
  spawn("npm run dev -w web", { stdio: "inherit", shell: true }),
  spawn("npm run helper", { stdio: "inherit", shell: true }),
];

const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// The web app going down ends the session; the helper failing (e.g. already running) doesn't.
children[0].on("exit", (code) => {
  stop();
  process.exit(code ?? 0);
});
