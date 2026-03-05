const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

const WALLETS = {
    TRC20: "TXfy5h2E1QZsdZuBp3u2iqUYyKpzK5sEqH",
    BEP20: "0x388C14aAa81cBfd225931121cF3A4213a5a58B11"
};

app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'invictuscapital00@gmail.com', pass: 'yrkk itax dszw hjli' }
});

const enviarCorreo = async (to, subject, html) => {
    try { await transporter.sendMail({ from: '"Invictus Capital" <invictuscapital00@gmail.com>', to, subject, html });
    } catch (e) { console.error("Error Email:", e); }
};

mongoose.connect("mongodb+srv://daxenmundial_db_user:Daxen2026@cluster0.bhzn4m3.mongodb.net/DaxenDB?retryWrites=true&w=majority");

const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nombre: String, email: { type: String, unique: true }, password: String,
    balance_usdt: { type: Number, default: 0 }, comisiones: { type: Number, default: 0 },
    referidoPor: String, verificado: { type: Boolean, default: false }, codigoVerificacion: String
}));

const Transaccion = mongoose.model('Transaccion', new mongoose.Schema({
    usuarioId: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, leida: { type: Boolean, default: false }, fecha: { type: Date, default: Date.now }
}));

// RUTAS
app.get('/api/config/wallets', (req, res) => res.json(WALLETS));

app.post('/api/registro', async (req, res) => {
    const { nombre, email, password, referidoPor } = req.body;
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const user = new Usuario({ nombre, email, password, referidoPor, codigoVerificacion: codigo });
    await user.save();
    await enviarCorreo(email, "🔑 Código Invictus", `<h1>Tu código: ${codigo}</h1>`);
    res.json({ mensaje: "OK" });
});

app.post('/api/verificar', async (req, res) => {
    const user = await Usuario.findOne({ email: req.body.email, codigoVerificacion: req.body.codigo });
    if (!user) return res.status(400).send();
    user.verificado = true; user.codigoVerificacion = null; await user.save();
    res.json({ mensaje: "OK" });
});

app.post('/api/login', async (req, res) => {
    const user = await Usuario.findOne({ email: req.body.email, password: req.body.password, verificado: true });
    if (!user) return res.status(401).send();
    res.json({ usuario: { nombre: user.nombre, id: user._id } });
});

app.get('/api/usuario/:id', async (req, res) => {
    const user = await Usuario.findById(req.params.id);
    res.json(user);
});

app.get('/api/notificaciones/:id', async (req, res) => {
    const nuevas = await Transaccion.find({ usuarioId: req.params.id, leida: false });
    await Transaccion.updateMany({ usuarioId: req.params.id, leida: false }, { leida: true });
    res.json(nuevas);
});

app.get('/api/historial/:id', async (req, res) => {
    const hist = await Transaccion.find({ usuarioId: req.params.id }).sort({ fecha: -1 });
    res.json(hist);
});

app.post('/api/notificar-deposito', async (req, res) => {
    const { nombre, monto, hash } = req.body;
    await enviarCorreo('invictuscapital00@gmail.com', `📥 Depósito: ${nombre}`, `<h1>Monto: ${monto} USDT</h1><p>Hash: ${hash}</p>`);
    res.json({ ok: true });
});

app.post('/api/admin/actualizar-saldo', async (req, res) => {
    const { usuarioId, nuevoMonto } = req.body;
    const user = await Usuario.findById(usuarioId);
    user.balance_usdt += parseFloat(nuevoMonto);
    await new Transaccion({ usuarioId, tipo: 'Deposito', monto: nuevoMonto }).save();
    if (user.referidoPor) {
        const ref = await Usuario.findOne({ nombre: user.referidoPor });
        if (ref) {
            const bono = nuevoMonto * 0.1;
            ref.comisiones += bono; await ref.save();
            await new Transaccion({ usuarioId: ref._id, tipo: 'Bono', monto: bono }).save();
        }
    }
    await user.save(); res.json({ ok: true });
});

app.listen(3000, () => console.log("🔥 Invictus Server Ready"));