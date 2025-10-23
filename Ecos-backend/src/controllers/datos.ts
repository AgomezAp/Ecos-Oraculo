import { Request, Response } from 'express';
import { Datos } from '../models/datos';

export const registrarDatos = async (req: Request, res: Response): Promise<void> => {
    const {
      Nombre,
      telefono,
      // pais // ❌ CAMPO ELIMINADO
    } = req.body;

    try {
      // Crear el nuevo registro de datos
      const datos = await Datos.create({
        Nombre,
        telefono,
        // pais // ❌ CAMPO ELIMINADO
      });

      res.status(200).json({
        message: "Datos registrados con éxito",
        datos: datos,
      });
    } catch (err: any) {
      console.log(err);
      res.status(500).json({
        error: "Problemas al registrar los datos",
        message: err.message || err,
      });
    }
}