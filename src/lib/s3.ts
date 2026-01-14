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

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined");
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);
    const contents = response.Contents || [];

    const imageFiles = contents
      .filter((item) => item.Key && /\.(jpg|jpeg|png)$/i.test(item.Key))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    // OPTIMIZACIÓN CRÍTICA:
    // En lugar de hacer N consultas a la base de datos (una por cada imagen),
    // haremos UNA sola consulta para traer todos los usuarios que coincidan.
    
    // 1. Extraemos todos los nombres de archivo
    const fileNames = imageFiles.map(file => file.Key!.split('/').pop() || "");

    // 2. Buscamos en la BD todos los usuarios cuyas imágenes estén en esa lista
    let users: { image: string | null; name: string | null; career: string | null }[] = [];
    try {
        users = await prisma.user.findMany({
          where: {
            image: {
              in: fileNames
            }
          }
        });
    } catch (dbError) {
        console.error("Database connection failed (Prisma):", dbError);
        // Fallback: Proceed with empty users array so we at least show images
    }

    // 3. Creamos un mapa rápido para buscar usuario por nombre de imagen
    const userMap = new Map();
    users.forEach(user => {
      if (user.image) {
        userMap.set(user.image, user);
      }
    });

    const imagesWithMetadata = await Promise.all(
      imageFiles.map(async (file) => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: file.Key,
        });

        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        const fileName = file.Key!.split('/').pop() || ""; 
        
        const user = userMap.get(fileName);

        return {
          key: file.Key!,
          url,
          lastModified: file.LastModified!,
          studentName: user ? (user.name || "") : "",
          studentCareer: user ? (user.career || "") : "",
        };
      })
    );
    
    const ALLOWED_CAREERS = [
      "INGENIERÍA DE SISTEMAS",
      "Ingeniería de Sistemas",
      "Ing.de Inteligencia Artificial",
      "Ingeniería de Ciberseguridad",
      "INGENIERÍA ESTADÍSTICA",
      "Ingeniería Estadística",
      "INGENIERÍA DE CIBERSEGURIDAD",
      "INGENIERÍA DE INTELIGENCIA ARTIFICIAL"
    ];

    // Filtro estricto solicitado: Solo devolver imágenes que tienen coincidencia en la base de datos
    return imagesWithMetadata.filter(img => 
      img.studentName !== "" && ALLOWED_CAREERS.includes(img.studentCareer || "")
    );

  } catch (error) {
    console.error("Error fetching images from S3:", error);
    return [];
  }
}
