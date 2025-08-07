"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SugerenciasController = void 0;
const sugerencia_1 = require("../models/sugerencia");
class SugerenciasController {
    // Crear nueva sugerencia
    static crearSugerencia(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sugerencia } = req.body;
                // Validaciones
                if (!sugerencia || sugerencia.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'La sugerencia no puede estar vacía'
                    });
                }
                if (sugerencia.length > 1000) {
                    return res.status(400).json({
                        success: false,
                        message: 'La sugerencia no puede exceder 1000 caracteres'
                    });
                }
                // Crear sugerencia
                const nuevaSugerencia = yield sugerencia_1.Sugerencia.create({
                    sugerencia: sugerencia.trim(),
                    ip: req.ip || req.socket.remoteAddress,
                    user_agent: req.get('User-Agent') || '',
                });
                res.status(201).json({
                    success: true,
                    message: '¡Sugerencia enviada exitosamente!',
                    data: {
                        id: nuevaSugerencia.id,
                        fecha: nuevaSugerencia.fecha
                    }
                });
            }
            catch (error) {
                console.error('Error al crear sugerencia:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor'
                });
            }
        });
    }
    // Obtener todas las sugerencias (para admin)
    static obtenerSugerencias(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { estado, limit = 50, offset = 0 } = req.query;
                const whereCondition = {};
                if (estado) {
                    whereCondition.estado = estado;
                }
                const sugerencias = yield sugerencia_1.Sugerencia.findAndCountAll({
                    where: whereCondition,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    order: [['fecha', 'DESC']]
                });
                res.json({
                    success: true,
                    data: sugerencias.rows,
                    total: sugerencias.count,
                    currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                    totalPages: Math.ceil(sugerencias.count / parseInt(limit))
                });
            }
            catch (error) {
                console.error('Error al obtener sugerencias:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error al obtener sugerencias'
                });
            }
        });
    }
    // Marcar sugerencia como leída
    static marcarComoLeida(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const sugerencia = yield sugerencia_1.Sugerencia.findByPk(id);
                if (!sugerencia) {
                    return res.status(404).json({
                        success: false,
                        message: 'Sugerencia no encontrada'
                    });
                }
                yield sugerencia.update({ estado: 'leida' });
                res.json({
                    success: true,
                    message: 'Sugerencia marcada como leída'
                });
            }
            catch (error) {
                console.error('Error al actualizar sugerencia:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error al actualizar sugerencia'
                });
            }
        });
    }
}
exports.SugerenciasController = SugerenciasController;
