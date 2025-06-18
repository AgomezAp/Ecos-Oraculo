"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const numerologia_1 = __importDefault(require("../routes/numerologia"));
const mapa_vocacional_1 = __importDefault(require("../routes/mapa-vocacional"));
const zodiaco_1 = __importDefault(require("../routes/zodiaco"));
const interpretador_sueno_1 = __importDefault(require("../routes/interpretador-sueno"));
const animal_interior_1 = __importDefault(require("../routes/animal-interior"));
const tabla_nacimiento_1 = __importDefault(require("../routes/tabla-nacimiento"));
const zodiaco_chino_1 = __importDefault(require("../routes/zodiaco-chino"));
const calculadora_amor_1 = __importDefault(require("../routes/calculadora-amor"));
const Pagos_1 = __importDefault(require("../routes/Pagos"));
// Cargar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3010;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.use(interpretador_sueno_1.default);
app.use(numerologia_1.default);
app.use(mapa_vocacional_1.default);
app.use(zodiaco_1.default);
app.use(animal_interior_1.default);
app.use(tabla_nacimiento_1.default);
app.use(zodiaco_chino_1.default);
app.use(calculadora_amor_1.default);
app.use(Pagos_1.default);
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Hagiografia Chat API",
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "INTERNAL_ERROR",
    });
});
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
    console.log(`🦅 Animal Interior API: http://localhost:${PORT}/api/animal-interior`);
});
exports.default = app;
