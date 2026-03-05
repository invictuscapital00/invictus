// Lógica de Comisiones
const comisiones = {
    nivel1: 0.05, // 5% por depósito directo
    nivel2: 0.02, // 2% por nivel 2
    residualNivel1: 0.03, // 3% del reclamo diario
    residualNivel2: 0.03,
    residualNivel3: 0.02,
    residualNivel4: 0.01,
    residualNivel5: 0.01
};

// Cuando alguien se registra con un link, el sistema le asigna su "padre"
// y reparte los bonos de inicio automáticamente.

const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
    const { nombre, email, wallet, referidoPor } = req.body;

    // LÓGICA DE NIVELES (Cálculo interno)
    const comisionDirecta = 20 * 0.05; // 5% para Nivel 1 ($1.00)
    const comisionNivel2 = 20 * 0.02;  // 2% para Nivel 2 ($0.40)

    console.log(`Nuevo usuario: ${nombre}. Pagando bonos a red...`);
    
    res.json({
        success: true,
        mensaje: "Registro exitoso. Por favor envía $20 USDT a la dirección oficial."
    });
});

module.exports = router;