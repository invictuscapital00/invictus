const express = require('express');
const router = express.Router();

// Esta función simula el clic en el botón de "Recoger"
router.post('/reclamar', (req, res) => {
    const { userId } = req.body;
    
    // Aquí el sistema preguntará a la base de datos: 
    // ¿Este usuario ya reclamó hoy?
    
    const montoGanancia = 0.33; // La fracción diaria de $20 en 60 días
    
    res.json({
        success: true,
        mensaje: `¡Felicidades! Has reclamado $${montoGanancia} USDT.`,
        proximoReclamo: "24 horas"
    });
});

module.exports = router;