const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const env = require("../config/env");

async function runFfmpeg(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(env.FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
    });
  });
}

async function transcodeVideoBufferToMp4(inputBuffer) {
  const id = crypto.randomUUID();
  const inputPath = path.join(os.tmpdir(), `${id}-input`);
  const outputPath = path.join(os.tmpdir(), `${id}-output.mp4`);

  await fs.writeFile(inputPath, inputBuffer);

  try {
    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const outputBuffer = await fs.readFile(outputPath);
    return {
      buffer: outputBuffer,
      mimetype: "video/mp4",
      extension: ".mp4",
    };
  } finally {
    await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
  }
}

module.exports = { transcodeVideoBufferToMp4 };
