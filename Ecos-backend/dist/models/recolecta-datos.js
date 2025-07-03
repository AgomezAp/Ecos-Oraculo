"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recolecta = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class recolecta extends sequelize_1.Model {
}
exports.recolecta = recolecta;
recolecta.init({
    NIF: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    numero_pasapote: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    pais: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    nombre: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    apellido: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    direccion: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    calle: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    codigo_postal: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    ciudad: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    provincia: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    comunidad_autonoma: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    importe: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: connection_1.default,
    tableName: "recolecta_datos",
    timestamps: false,
});
