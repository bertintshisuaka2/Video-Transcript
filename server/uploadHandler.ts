import { Router } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const uploadRouter = Router();

uploadRouter.post("/upload-file", async (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert array back to buffer
    const buffer = Buffer.from(fileData);

    // Generate unique file key
    const fileKey = `uploads/${nanoid()}-${fileName}`;

    // Upload to S3
    const result = await storagePut(fileKey, buffer, fileType);

    res.json({ url: result.url, key: result.key });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});
