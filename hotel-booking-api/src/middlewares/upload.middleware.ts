import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //  DETETA SE ESTÁ NO DOCKER/PRODUÇÃO (dist) OU EM DESENVOLVIMENTO (src)
    const isProduction = process.env.NODE_ENV === "production" || __dirname.includes("dist");
    
    // Se for produção, guarda em "dist/uploads", se for desenvolvimento guarda em "src/uploads"
    const targetDir = isProduction 
      ? path.join(process.cwd(), "dist", "uploads")
      : path.join(process.cwd(), "src", "uploads");

    // Garante que a pasta existe no contêiner para não dar erro de "Folder not found"
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo nao permitido"));
    }

    cb(null, true);
  },
});
