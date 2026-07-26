import * as Minio from "minio";

let client: Minio.Client | undefined;

export function getMinioClient() {
  if (client) return client;

  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endPoint || !accessKey || !secretKey) {
    throw new Error("MinIO environment variables are not fully configured");
  }

  client = new Minio.Client({
    endPoint,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey,
    secretKey,
  });

  return client;
}

export function getMinioBucket() {
  const bucket = process.env.MINIO_BUCKET_NAME;
  if (!bucket) {
    throw new Error("MINIO_BUCKET_NAME environment variable is not set");
  }
  return bucket;
}
