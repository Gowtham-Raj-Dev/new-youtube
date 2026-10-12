// Stands in for `ffmpeg-static` in the downloadable helper: ffmpeg.exe ships in the same folder as the program.
import { dirname, join } from "node:path";

export default join(dirname(process.execPath), process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
