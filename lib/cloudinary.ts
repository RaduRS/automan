import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (server-side only)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload base64 image data to Cloudinary
 * @param base64Data - The base64 encoded image data
 * @param filename - The filename to use for the image (without extension)
 * @returns Promise<string> - The public URL of the uploaded image
 */
export async function uploadImageToCloudinary(
  base64Data: string,
  filename: string
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to Cloudinary using the same pattern as your other uploads
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "image",
              folder: "generated-images", // Keep images organized
              public_id: filename,
              format: "png", // Force PNG format
              transformation: [
                { quality: "auto", fetch_format: "auto" }, // Auto optimization
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            }
          )
          .end(buffer);
      }
    );
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}

export { cloudinary };
