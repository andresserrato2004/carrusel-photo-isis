import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface CarouselImage {
  key: string;
  url: string;
  lastModified: Date;
  studentName?: string;
  studentCareer?: string;
}

export async function getCarouselImages(): Promise<CarouselImage[]> {
  const bucketName = process.env.S3_BUCKET_NAME;

  console.log("=== getCarouselImages called ===");
  console.log("S3_BUCKET_NAME:", bucketName);

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined");
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    console.log("Fetching from S3...");
    const response = await s3Client.send(command);
    const contents = response.Contents || [];
    console.log("S3 files found:", contents.length);

    // Filter images and sort by newest first
    const imageFiles = contents
      .filter((item) => item.Key && /\.(jpg|jpeg|png)$/i.test(item.Key))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    const imagesWithMetadata = await Promise.all(
      imageFiles.map(async (file) => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: file.Key,
        });

        // Generate signed URL for display
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        
        // Clean filename to match DB 'image' column (removes folder paths if any)
        const fileName = file.Key!.split('/').pop() || ""; 
        
        let studentName = "";
        let studentCareer = "";

        try {
            // STRICT MATCH: Look for user where 'image' column equals the S3 filename
            const user = await prisma.user.findFirst({
                where: {
                    image: fileName
                }
            });

            if (user) {
                studentName = user.name || "";
                studentCareer = user.career || "";
            } 

        } catch (dbError) {
             console.error(`Database error for file ${fileName}:`, dbError);
        }

        return {
          key: file.Key!,
          url,
          lastModified: file.LastModified!,
          studentName,
          studentCareer,
        };
      })
    );

    // Solo devolver imágenes que tienen coincidencia en la base de datos
    const filteredImages = imagesWithMetadata.filter(img => img.studentName !== "");
    
    return filteredImages;
  } catch (error) {
    console.error("Error fetching images from S3:", error);
    return [];
  }
}
