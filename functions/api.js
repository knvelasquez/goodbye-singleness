const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de vistas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inicio.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/wheel', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'wheel.html'));
  });

app.get('/config-juego', (req, res) => {
  res.json({
    totalJugadores: 6,
    cantidadImpostores: 1,
    rolesDisponibles: ['Tripulante', 'Impostor']
  });
});

app.get('/reiniciar', (req, res) => {
  io.emit('reiniciarSesion');
  res.send('Sesiones reiniciadas. Redirigiendo...');
});

let usuariosConectados = [];

// WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado');

  // Registrar nuevo usuario
  socket.on('nuevoUsuario', ({ nombre, rol }) => {
    const existe = usuariosConectados.find(user => user.nombre === nombre);
    console.log(usuariosConectados)
    if (!existe) {
      usuariosConectados.push({ id: socket.id, nombre, rol });
      console.log(`✅ Jugador agregado: ${nombre}`);
      console.log(usuariosConectados)
    } else {
      console.log(`⚠️ El jugador ${nombre} ya estaba conectado`);
    }

    io.emit('actualizarUsuarios', usuariosConectados);
  });

  // Solicitar usuarios
  socket.on('solicitarUsuariosBack', () => {
    console.log("solicitarUsuariosBack",usuariosConectados)
    socket.emit('actualizarUsuarios', usuariosConectados);
  });

  // Reiniciar sesión
  socket.on('reiniciarSesion', () => {
    usuariosConectados = [];
    io.emit('actualizarUsuarios', usuariosConectados);
    io.emit('reiniciarSesionFront');
    console.log('🔁 Sesiones reiniciadas');
  });

  
  // Desconexión
  socket.on('disconnect', () => {
    usuariosConectados = usuariosConectados.filter(u => u.id !== socket.id);
    io.emit('actualizarUsuarios', usuariosConectados);
    console.log('❌ Usuario desconectado');
  });

// Asignar Novio
socket.on('asignarNovio', (nombre) => {
    // Verificar si ya hay un "Novio"
    const yaHayNovio = usuariosConectados.find(u => u.rol === 'Novio');

    if (!yaHayNovio) {
      const jugador = usuariosConectados.find(u => u.nombre === nombre);
      if (jugador) {
        jugador.lastRol=jugador.rol 
        jugador.rol = 'Novio';
        io.emit('actualizarRol', { nombre: jugador.nombre, rol: 'Novio' });
        io.emit('actualizarUsuarios', usuariosConectados);
        console.log(jugador)
        console.log(`💍 ${nombre} es ahora el Novio`);
      }
    } else {
      console.log('🚫 Ya hay un Novio asignado');
    }
  });
  
  socket.on('quitarNovio', (nombre) => {
    const jugador = usuariosConectados.find(user => user.nombre === nombre && user.rol === 'Novio');
    
    if (jugador) {
      // Restaurar el rol anterior
      const rolAnterior = jugador.lastRol || '';  // Si no existe rolAnterior, lo dejamos vacío
      jugador.rol = rolAnterior;  // Restaurar el rol anterior del jugador
      //delete jugador.lastRoll;  // Eliminar la propiedad rolAnterior
  
      // Emitir el evento con el nuevo rol
      io.emit('actualizarRol', { nombre: jugador.nombre, rol: rolAnterior });
        console.log(jugador)
      console.log(`❌ El rol de Novio ha sido removido de ${nombre}. El rol anterior era: ${rolAnterior}`);
    } else {
      console.log(`⚠️ El jugador ${nombre} no tiene el rol de Novio`);
    }
  });

  // Evento para iniciar el juego
   socket.on('iniciarJuego', () => {
    console.log('Juego iniciado');
    // Aquí puedes agregar cualquier lógica para iniciar el juego, como cambiar el estado del juego,
    // notificar a todos los jugadores, etc.
    io.emit('inicioJuego'); // Por ejemplo, emitir un evento a todos los jugadores
  });

  // Asignar rol de "Impostor"
  socket.on('asignarImpostor', (nombre) => {
    const usuario = usuariosConectados.find(u => u.nombre === nombre);
    if (usuario && usuario.rol !== 'Impostor') {
      // Guardar el rol original
      const rolAnterior = usuario.rol;
      usuario.lastRol=usuario.rol
      usuario.rol = 'Impostor';
      usuario.rolAnterior = rolAnterior; // Guardamos el rol anterior
      io.emit('actualizarRol', { nombre: usuario.nombre, rol: 'Impostor' });
      io.emit('actualizarUsuarios', usuariosConectados); // Notificar a todos los clientes
    }
  });

  // Quitar rol de "Impostor" y restaurar rol anterior
  socket.on('quitarImpostor', (nombre) => {
    const usuario = usuariosConectados.find(u => u.nombre === nombre);
    if (usuario && usuario.rol === 'Impostor') {
      const rolAnterior = usuario.rolAnterior || 'Sin rol'; // Si no tenía rol anterior, 'Sin rol'
      usuario.rol = rolAnterior; // Restaurar el rol anterior
      usuario.rolAnterior = null; // Limpiar el rol anterior
      io.emit('actualizarRol', { nombre: usuario.nombre, rol: usuario.lastRol });
      io.emit('actualizarUsuarios', usuariosConectados); // Notificar a todos los clientes
    }
  });


  // Asignar rol de "Impostor"
  socket.on('asignarTripulante', (nombre) => {
    const usuario = usuariosConectados.find(u => u.nombre === nombre);
    if (usuario && usuario.rol !== 'Tripulante') {
      // Guardar el rol original
      const rolAnterior = usuario.rol;
      usuario.lastRol=usuario.rol
      usuario.rol = 'Tripulante';
      usuario.rolAnterior = rolAnterior; // Guardamos el rol anterior
      io.emit('actualizarRol', { nombre: usuario.nombre, rol: 'Tripulante' });
      io.emit('actualizarUsuarios', usuariosConectados); // Notificar a todos los clientes
    }
  });

  // Quitar rol de "Impostor" y restaurar rol anterior
  socket.on('quitarTripulante', (nombre) => {
    const usuario = usuariosConectados.find(u => u.nombre === nombre);
    if (usuario && usuario.rol === 'Tripulante') {
      const rolAnterior = usuario.rolAnterior || 'Sin rol'; // Si no tenía rol anterior, 'Sin rol'
      usuario.rol = rolAnterior; // Restaurar el rol anterior
      usuario.rolAnterior = null; // Limpiar el rol anterior
      io.emit('actualizarRol', { nombre: usuario.nombre, rol: usuario.lastRol });
      io.emit('actualizarUsuarios', usuariosConectados); // Notificar a todos los clientes
    }
  });


// Cuando el administrador habilite la ruleta para un jugador:
socket.on('habilitarRuleta', (nombreJugador) => {
    // Buscar al jugador en la lista de jugadores
    const jugador = usuariosConectados.find(j => j.nombre === nombreJugador);

    if (jugador) {
      // Emitir el evento para habilitar la ruleta en el cliente correspondiente
      io.to(jugador.id).emit('habilitarRuleta');
    }
  });

  // Emite el evento para girar la ruleta
  socket.on('girarRuleta', (rol) => {
        console.log('Ruleta girando',rol);
        io.emit('girarRuletaWheel',rol);  // Envía el evento a todos los clientes conectados
    });

     // Emite una pista alque giro la ruleta
    socket.on('habilitarPista', (tips) => {
        console.log('Evento habilitarPista',tips);
        io.emit('habilitarPistaFront',tips);  // Envía el evento a todos los clientes conectados
    });

});


// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
