// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import numerologyRoutes from "../routes/numerologia";
import vocationalRoutes from "../routes/mapa-vocacional";
import zodiacoRoutes from "../routes/zodiaco";
import interpretadorsueno from "../routes/interpretador-sueno";
import animalInteriorRoutes from "../routes/animal-interior";
import tablaNacimientoRoutes from '../routes/tabla-nacimiento';
import zodiacoChino from '../routes/zodiaco-chino';
import calculadoraAmor from '../routes/calculadora-amor';
import RPagos from "../routes/Pagos";
// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(interpretadorsueno);
app.use(numerologyRoutes);
app.use(vocationalRoutes);
app.use(zodiacoRoutes);
app.use(animalInteriorRoutes);
app.use(tablaNacimientoRoutes); 
app.use(zodiacoChino);
app.use(calculadoraAmor);
app.use(RPagos)
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Hagiografia Chat API",
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado",
    code: "NOT_FOUND",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🔢 Numerology API: http://localhost:${PORT}/api/numerology`);
  console.log(`🎯 Vocational API: http://localhost:${PORT}/api/vocational`);
  console.log(`- Zodíaco: http://localhost:${PORT}/api/zodiaco`);
  console.log(
    `🦅 Animal Interior API: http://localhost:${PORT}/api/animal-interior`
  );
});
export default app;
