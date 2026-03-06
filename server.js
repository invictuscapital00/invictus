const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

// CONFIGURACIÓN DE BILLETERAS OFICIALES
const WALLETS = {
    TRC20: "TXfy5h2E1QZsdZuBp3u2iqUYyKpzK5sEqH",
    BEP20: "0x388C14aAa81cBfd225931121cF3A4213a5a58B11"
};

// MIDDLEWARES
app.use(express.json());
// Permitir que tu GitHub Pages se conecte al servidor
app.use(cors({
    origin: ['https://invictuscapital00.github.io', 'http://localhost:3000']
}));
app.use(express.static('public')); 

// CONFIGURACIÓN DE CORREO ELECTRÓNICO (GMAIL)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'invictuscapital00@gmail.com', 
        pass: 'yrkk itax dszw hjli' // App Password de Google
    }
});

const enviarCorreo = async (to, subject, html) => {
    try { 
        await transporter.sendMail({ 
            from: '"Invictus Capital" <invictuscapital00@gmail.com>', 
            to, 
            subject, 
            html 
        });
    } catch (e) { 
        console.error("Error en el envío de Email:", e); 
    }
};

// CONEXIÓN A BASE DE DATOS (MONGODB)
mongoose.connect("mongodb+srv://daxenmundial_db_user:Daxen2026@cluster0.bhzn4m3.mongodb.net/DaxenDB?retryWrites=true&w=majority")
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// MODELOS DE DATOS
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nombre: String, 
    email: { type: String, unique: true }, 
    password: String,
    balance_usdt: { type: Number, default: 0 }, 
    comisiones: { type: Number, default: 0 },
    referidoPor: String, 
    verificado: { type: Boolean, default: false }, 
    codigoVerificacion: String,
    fechaRegistro: { type: Date, default: Date.now }
}));

const Transaccion = mongoose.model('Transaccion', new mongoose.Schema({
    usuarioId: mongoose.Schema.Types.ObjectId, 
    tipo: { type: String, enum: ['Deposito', 'Retiro', 'Bono'] }, 
    monto: Number, 
    leida: { type: Boolean, default: false }, 
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DE LA API ---

app.get('/api/config/wallets', (req, res) => res.json(WALLETS));

// Registro de nuevos socios
app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, email, password, referidoPor } = req.body;
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new Usuario({ nombre, email, password, referidoPor, codigoVerificacion: codigo });
        await user.save();
        
        await enviarCorreo(email, "🔑 Tu Código de Activación Invictus", `
            <div style="font-family: sans-serif; text-align: center; background: #0a0a0a; color: white; padding: 20px;">
                <h1 style="color: #00ff88;">BIENVENIDO A INVICTUS</h1>
                <p>Tu código de seguridad para activar tu cuenta es:</p>
                <div style="font-size: 2rem; background: #161616; padding: 10px; border: 1px solid #00ff88; display: inline-block;">${codigo}</div>
            </div>
        `);
        res.json({ mensaje: "OK" });
    } catch (error) {
        res.status(400).json({ error: "El correo ya está en uso." });
    }
});

// Verificación de código
app.post('/api/verificar', async (req, res) => {
    const user = await Usuario.findOne({ email: req.body.email, codigoVerificacion: req.body.codigo });
    if (!user) return res.status(400).json({ error: "Código inválido" });
    
    user.verificado = true; 
    user.codigoVerificacion = null; 
    await user.save();
    res.json({ mensaje: "Cuenta activada" });
});

// Login
app.post('/api/login', async (req, res) => {
    const user = await Usuario.findOne({ email: req.body.email, password: req.body.password, verificado: true });
    if (!user) return res.status(401).json({ error: "Credenciales incorrectas o cuenta no verificada" });
    res.json({ usuario: { nombre: user.nombre, id: user._id } });
});

// Obtener datos de usuario
app.get('/api/usuario/:id', async (req, res) => {
    const user = await Usuario.findById(req.params.id);
    res.json(user);
});

// Historial
app.get('/api/historial/:id', async (req, res) => {
    const hist = await Transaccion.find({ usuarioId: req.params.id }).sort({ fecha: -1 });
    res.json(hist);
});

// Notificar Depósito (Aporte)
app.post('/api/notificar-deposito', async (req, res) => {
    const { nombre, monto, hash } = req.body;
    await enviarCorreo('invictuscapital00@gmail.com', `📥 NUEVO APORTE: ${nombre}`, `
        <h3>Notificación de Aporte Colaborativo</h3>
        <p><b>Socio:</b> ${nombre}</p>
        <p><b>Monto:</b> ${monto} USDT</p>
        <p><b>Hash (TXID):</b> ${hash}</p>
    `);
    res.json({ ok: true });
});

// --- PANEL DE ADMINISTRACIÓN ---

app.post('/api/admin/actualizar-saldo', async (req, res) => {
    try {
        const { usuarioId, nuevoMonto } = req.body;
        const montoNum = parseFloat(nuevoMonto);
        
        const user = await Usuario.findById(usuarioId);
        user.balance_usdt += montoNum;
        
        // Registrar transacción de depósito
        await new Transaccion({ usuarioId, tipo: 'Deposito', monto: montoNum }).save();
        
        // Lógica de Bonos de Red (10% al patrocinador)
        if (user.referidoPor) {
            const patrocinador = await Usuario.findOne({ nombre: user.referidoPor });
            if (patrocinador) {
                const bonoMonto = montoNum * 0.10; // 10% de comisión
                patrocinador.comisiones += bonoMonto;
                await patrocinador.save();
                
                // Registrar el bono en el historial del patrocinador
                await new Transaccion({ usuarioId: patrocinador._id, tipo: 'Bono', monto: bonoMonto }).save();
            }
        }
        
        await user.save(); 
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Fallo al procesar el capital" });
    }
});

// Obtener lista de todos los usuarios para el Admin
app.get('/api/admin/usuarios', async (req, res) => {
    const users = await Usuario.find().sort({ fechaRegistro: -1 });
    res.json(users);
});

// Obtener invitados de un líder
app.get('/api/red/:nombreLider', async (req, res) => {
    const invitados = await Usuario.find({ referidoPor: req.params.nombreLider });
    res.json(invitados);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Invictus Engine Running on Port ${PORT}`));