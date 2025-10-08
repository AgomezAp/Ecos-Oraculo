import {
    DataTypes,
    Model,
  } from 'sequelize';
  import sequelize from '../database/connection';

  class Datos extends Model {}

  Datos.init({
    Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    pais: {
        type: DataTypes.STRING,
        allowNull: false,
    },
},
{
    sequelize,
    modelName: 'Datos',
    timestamps: false,
}
);
export { Datos };