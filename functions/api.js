const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app); // Crear un solo servidor para Express y Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Asegúrate de que el cliente se conecte a este origen
    methods: ["GET", "POST"]
  }
});

// Servir archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, 'public'))); // Cambié la ruta para que sea relativa a la raíz

// Redirigir a 'login.html' cuando se accede a la ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html')); // La ruta ahora debe ser correcta
});

app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'inicio.html')); // La ruta ahora debe ser correcta
  });

// Redirigir a 'admin.html' cuando se accede a la ruta '/admin'
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Ruta para reiniciar las sesiones
app.get('/reiniciar', (req, res) => {
  io.emit('reiniciarSesion');  // Emitir evento para reiniciar las sesiones
  res.send('Sesiones reiniciadas. Redirigiendo...');
});

let usuariosConectados = [];

// Manejo de conexiones de WebSocket
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');
  
  socket.on('nuevoUsuario', (nombre) => {
    const usuario = { id: socket.id, nombre };
    usuariosConectados.push(usuario);
    io.emit('actualizarUsuarios', usuariosConectados);  // Enviar lista de usuarios conectados
  });

  socket.on('solicitarUsuarios', () => {
    socket.emit('actualizarUsuarios', usuariosConectados);
  });


  socket.on('reiniciarSesion', () => {
    usuariosConectados = [];
    io.emit('actualizarUsuarios', usuariosConectados);
    io.emit('reiniciarSesionFront', usuariosConectados);
    console.log('Evento reiniciarSesion recibido');
  });

  socket.on('disconnect', () => {
    usuariosConectados = usuariosConectados.filter(u => u.id !== socket.id);  // Eliminar usuario desconectado
    io.emit('actualizarUsuarios', usuariosConectados);  // Enviar lista actualizada
  });
});

// Iniciar el servidor en el puerto 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
