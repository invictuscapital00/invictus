const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Modelos necesarios
const Usuario = mongoose.model('Usuario');
const Transaccion = mongoose.model('Transaccion');

// ESTRUCTURA DE COMISIONES ACTUALIZADA
const COMISIONES = {
    nivel1: 0.05, // 5% por aporte directo
    nivel2: 0.02, // 2% por nivel 2 (invitado de mi invitado)
    residualNivel1: 0.03, // 3% del reclamo diario del socio
    residualNivel2: 0.03,
    residualNivel3: 0.02,
    residualNivel4: 0.01,
    residualNivel5: 0.01
};

// RUTA DE REGISTRO CON ASIGNACIÓN DE LINAJE
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, referidoPor } = req.body;

        // 1. Crear el nuevo socio (Aporte inicial base de $20 para el cálculo)
        const nuevoSocio = new Usuario({
            nombre,
            email,
            password,
            referidoPor, // Aquí guardamos quién lo invitó
            balance_usdt: 0,
            verificado: false
        });

        await nuevoSocio.save();

        // 2. LÓGICA DE REPARTO DE BONOS AUTOMÁTICOS (Si hay patrocinador)
        if (referidoPor) {
            // BUSCAR NIVEL 1 (Patrocinador Directo)
            const padre = await Usuario.findOne({ nombre: referidoPor });
            if (padre) {
                const bonoN1 = 20 * COMISIONES.nivel1; // $1.00
                padre.comisiones += bonoN1;
                await padre.save();
                await registrarBono(padre._id, bonoN1, `Bono Directo de ${nombre}`);

                // BUSCAR NIVEL 2 (El que invitó al patrocinador)
                if (padre.referidoPor) {
                    const abuelo = await Usuario.findOne({ nombre: padre.referidoPor });
                    if (abuelo) {
                        const bonoN2 = 20 * COMISIONES.nivel2; // $0.40
                        abuelo.comisiones += bonoN2;
                        await abuelo.save();
                        await registrarBono(abuelo._id, bonoN2, `Bono Nivel 2 (Red de ${nombre})`);
                    }
                }
            }
        }

        res.json({
            success: true,
            mensaje: "Registro exitoso. Procede a realizar tu aporte colaborativo de $20 USDT para activar los beneficios de red."
        });

    } catch (error) {
        console.error("Error en registro de red:", error);
        res.status(500).json({ success: false, mensaje: "Error al procesar el registro en la red." });
    }
});

// FUNCIÓN AUXILIAR PARA REGISTRAR LOS BONOS EN EL HISTORIAL
async function registrarBono(usuarioId, monto, detalle) {
    const transaccion = new Transaccion({
        usuarioId,
        tipo: 'Bono',
        monto: monto,
        detalle: detalle // Añadimos detalle para que el socio sepa de dónde vino el dinero
    });
    await transaccion.save();
}

module.exports = router;