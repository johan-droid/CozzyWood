const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const env = require("../config/env");

const uploadsRoot = path.resolve(process.cwd(), "uploads");
let s3Client = null;

function sanitizeFileName(name) {
  return String(name || "media")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function buildMediaKey(userId, fileName) {
  const safeName = sanitizeFileName(fileName);
  return `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

function hasS3Config() {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY
  );
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

async function storeLocally({ key, buffer }) {
  const absolutePath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return {
    key,
    storage: "local",
    url: `/uploads/${key}`,
  };
}

async function storeInS3({ key, buffer, mimetype }) {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const fallbackUrl = `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
  return {
    key,
    storage: "s3",
    url: env.S3_PUBLIC_BASE_URL
      ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
      : fallbackUrl,
  };
}

async function storeMedia({ key, buffer, mimetype }) {
  if (env.MEDIA_STORAGE === "s3") {
    if (!hasS3Config()) {
      const error = new Error("S3/R2 storage selected but S3 env vars are incomplete");
      error.statusCode = 500;
      throw error;
    }
    return storeInS3({ key, buffer, mimetype });
  }
  return storeLocally({ key, buffer });
}

module.exports = { buildMediaKey, storeMedia };
