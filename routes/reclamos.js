const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importamos los modelos (asegúrate de que estén definidos en tu server.js o en un archivo models.js)
const Usuario = mongoose.model('Usuario');
const Transaccion = mongoose.model('Transaccion');

// Función para reclamar la ganancia diaria
router.post('/reclamar', async (req, res) => {
    const { usuarioId } = req.body; // Cambiado a usuarioId para coincidir con el resto del sistema
    
    try {
        const user = await Usuario.findById(usuarioId);
        if (!user) return res.status(404).json({ success: false, mensaje: "Socio no encontrado" });

        // Cálculo de la ganancia diaria (basado en tu Proyecto 100K)
        const montoGanancia = 0.33; 

        // --- LÓGICA DE SEGURIDAD 24 HORAS ---
        // Buscamos si existe un reclamo en las últimas 24 horas
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yaReclamo = await Transaccion.findOne({
            usuarioId: user._id,
            tipo: 'Bono',
            fecha: { $gte: hace24Horas }
        });

        if (yaReclamo) {
            return res.status(400).json({ 
                success: false, 
                mensaje: "Ya has reclamado tu recompensa de hoy. Vuelve en 24 horas." 
            });
        }

        // --- PROCESAR RECOMPENSA ---
        // 1. Actualizar balance del usuario
        user.balance_usdt += montoGanancia;
        await user.save();

        // 2. Registrar en el historial de movimientos
        const nuevaTransaccion = new Transaccion({
            usuarioId: user._id,
            tipo: 'Bono',
            monto: montoGanancia
        });
        await nuevaTransaccion.save();

        res.json({
            success: true,
            mensaje: `¡Felicidades ${user.nombre}! Has reclamado $${montoGanancia} USDT.`,
            nuevoSaldo: user.balance_usdt.toFixed(2),
            proximoReclamo: "24 horas"
        });

    } catch (error) {
        console.error("Error en reclamo:", error);
        res.status(500).json({ success: false, mensaje: "Error interno del sistema" });
    }
});

module.exports = router;