// Stands in for `@ffprobe-installer/ffprobe` in the downloadable helper: ffprobe.exe ships in the same folder as the program.
import { dirname, join } from "node:path";

export default { path: join(dirname(process.execPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe") };
