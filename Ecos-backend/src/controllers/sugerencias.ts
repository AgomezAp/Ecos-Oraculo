import { Request, Response } from 'express';
import { Sugerencia } from '../models/sugerencia';

export class SugerenciasController {
    
    // Crear nueva sugerencia
    static async crearSugerencia(req: Request, res: Response) {
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
            const nuevaSugerencia = await Sugerencia.create({
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

        } catch (error) {
            console.error('Error al crear sugerencia:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener todas las sugerencias (para admin)
    static async obtenerSugerencias(req: Request, res: Response) {
        try {
            const { estado, limit = 50, offset = 0 } = req.query;
            
            const whereCondition: any = {};
            if (estado) {
                whereCondition.estado = estado;
            }

            const sugerencias = await Sugerencia.findAndCountAll({
                where: whereCondition,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                order: [['fecha', 'DESC']]
            });

            res.json({
                success: true,
                data: sugerencias.rows,
                total: sugerencias.count,
                currentPage: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
                totalPages: Math.ceil(sugerencias.count / parseInt(limit as string))
            });

        } catch (error) {
            console.error('Error al obtener sugerencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener sugerencias'
            });
        }
    }

    // Marcar sugerencia como leída
    static async marcarComoLeida(req: Request, res: Response) {
        try {
            const { id } = req.params;
            
            const sugerencia = await Sugerencia.findByPk(id);
            if (!sugerencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Sugerencia no encontrada'
                });
            }

            await sugerencia.update({ estado: 'leida' });

            res.json({
                success: true,
                message: 'Sugerencia marcada como leída'
            });

        } catch (error) {
            console.error('Error al actualizar sugerencia:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar sugerencia'
            });
        }
    }
}