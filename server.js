// IMPORTACION MODULOS
const express = require("express");
const app = express();                                       // Iniciar app
const http = require("http").createServer(app);              // Crear servidor HTTP
const io = require("socket.io")(http);                       // Usar Scoket.io en el servidor
app.use(express.static("public"));                           // Acceso a archivos estáticos desde "public"

// CONTRASEÑA
const contrasena = "1234";
app.get("/index_pc.html", (req, res) => {                    // Acceso a index_pc.html con contraseña
  const contraseñaUsuario = req.query.password;
  if (contraseñaUsuario === contrasena) {
    res.sendFile(__dirname + "/public/index_pc.html");
  } else {
    res.send("Acceso denegado. Contraseña incorrecta."); 
  }
});

// GUARDAR ESTADO MARCADOR
let estado = {
  nombres: { A: "", B: "" },
  goles: { A: 0, B: 0 },
  tiempoPartido: 600,
  tiempoJuego: 1,
  tiempoPosesion: 60,
  tarjetas: {
    A: { amarilla: [], roja: [], verde: 0 },
    B: { amarilla: [], roja: [], verde: 0 }}
};

// CONEXION DE CLIENTES
io.on("connection", (socket) => {                            // Se ejecuta cuando un cliente se conecta al servidor a través de Socket.io
  console.log("Nuevo cliente conectado");
  // Socket.on escucha cada evento del cliente y socket.emit, io.emit, etc devuelve eventos con los datos actualizados
  socket.on("solicitarEstado", () => {
    socket.emit("estadoCompleto", estado);
  });

  socket.on('nombreEquipo', (data) => {
    estado.nombres[data.equipo] = data.nombre;
    io.emit('nombreEquipo', data);
  });

  socket.on("goles", (data) => {
    estado.goles[data.equipo] = data.goles;
    socket.broadcast.emit("goles", data);
  });

  socket.on("cronometroPartido", (data) => {
    estado.tiempoPartido = data.tiempo;
    socket.broadcast.emit("cronometroPartido", data);
  });

  socket.on("tiempoJuego", (data) => {
    estado.tiempoJuego = data.tiempo;
    socket.broadcast.emit("tiempoJuego", data);
  });

  socket.on("cronometroPosesion", (data) => {
    estado.tiempoPosesion = data.tiempo;
    socket.broadcast.emit("cronometroPosesion", data);
  });
  // Gestión de tarjetas
  socket.on("tarjeta", (data) => {
    const { equipo, tipo, operacion, nombre } = data;
    if (operacion === "mas") {                                                             // Añade tarjetas con la operación "más"
      if (tipo === "verde") {
        estado.tarjetas[equipo][tipo]++;
      } else {
        estado.tarjetas[equipo][tipo].push({ nombre: nombre || tipo.toUpperCase() });      // En tarjetas Rojas y Amarillas se añade también el nombre del jugador
      }
    } else if (operacion === "menos") {
      if (tipo === "verde") {
        estado.tarjetas[equipo][tipo] = Math.max(estado.tarjetas[equipo][tipo] - 1, 0);    // Resta tarjetas con la operacióm "menos"
      } else {
        estado.tarjetas[equipo][tipo].pop();
      }
    }
    socket.broadcast.emit("tarjeta", data);
  });
  // Desconexión del cliente
  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });

  // Reinicio marcador
  socket.on("reiniciarMarcador", () => {
    console.log("Marcador reiniciado desde el panel de control");
  
    estado = {
      nombres: { A: "", B: "" },
      goles: { A: 0, B: 0 },
      tiempoPartido: 600,
      tiempoJuego: 1,
      tiempoPosesion: 60,
      tarjetas: {
        A: { amarilla: [], roja: [], verde: 0 },
        B: { amarilla: [], roja: [], verde: 0 }
      }
    };
  
    io.emit("estadoCompleto", estado); // Notifica a todos los clientes para actualizar el estado
  });  
});

// ESCUCHA DEL SERVIDOR
const port = process.env.PORT || 3001;
http.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
});