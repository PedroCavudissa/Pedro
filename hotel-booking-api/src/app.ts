import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import amenityRoutes from "./routes/amenity.routes.js";
import roomRoutes from "./routes/room.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import reportRoutes from "./routes/report.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import integrationRoutes from "./routes/integration.routes.js";
import { securityHeaders } from "./middlewares/security.middleware.js";

const app = express();
app.use((req, res, next) => {
  console.log("Requisição recebida:", req.method, req.originalUrl);
  next();
});
app.use(cors({
  origin: "http://10.0.0.4:9091",
  credentials: true
}));
app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Swagger
const swaggerDocument = YAML.load(
  path.join(process.cwd(), "src/docs/swagger.yaml")
);

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/rooms", roomRoutes);
app.use("/amenities", amenityRoutes);
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = path.join(__dirname, "uploads");
console.log("Servindo uploads de:", uploadsPath);
console.log("Pasta existe?", fs.existsSync(uploadsPath));

app.use("/uploads", express.static(uploadsPath));
app.use("/reservations", reservationRoutes);
app.use("/policies", policyRoutes);
app.use("/reports", reportRoutes);
app.use("/public/tickets", ticketRoutes);
app.use("/integrations", integrationRoutes);

app.get("/", (req, res) => {
  res.send("Hotel Booking API Running ");
});
export default app;
