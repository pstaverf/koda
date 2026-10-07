import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

export const s3 = new S3Client({
  region: env.s3.region,
  endpoint: env.s3.endpoint,
  forcePathStyle: env.s3.forcePathStyle,
  credentials: {
    accessKeyId: env.s3.accessKey,
    secretAccessKey: env.s3.secretKey
  }
});

export const putObject = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  await s3.send(new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, Body: body, ContentType: contentType }));
};

export const deleteObject = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
};

export const presignedGetUrl = async (key: string): Promise<string> =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }), { expiresIn: env.s3.urlTtlSeconds });

export const presignedGetUrlOrNull = async (key: string | null): Promise<string | null> =>
  key === null ? null : presignedGetUrl(key);
