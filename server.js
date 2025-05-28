// IMPORTACION MODULOS
const servidorId = "server1";
const express = require("express");
const app = express();                                       // Iniciar app
const http = require("http").createServer(app);              // Crear servidor HTTP
const io = require("socket.io")(http);                       // Usar Scoket.io en el servidor
app.use(express.static("public"));                           // Acceso a archivos estáticos desde "public"

// CONEXION BASE DE DATOS
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://furnvnscbdlzwzmdqvzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cm52bnNjYmRsend6bWRxdnpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIwNzE2NiwiZXhwIjoyMDYyNzgzMTY2fQ.eWz3ghMP_f_TMipQsRur_eRP_b9zzde7HLSFsTp2UwI';
const supabase = createClient(supabaseUrl, supabaseKey);

// CONTRASEÑA
const contrasena = "1234";
app.get("/index_pc.html", (req, res) => {                    // Acceso a index_pc.html con contraseña
  const contraseñaUsuario = req.query.password;
  if (contraseñaUsuario === contrasena) {
    res.sendFile(__dirname + "/public/index_pc.html");
  } else {
    res.send("Acceso denegado. Contraseña incorrecta.");}
});


// GUARDAR ESTADO MARCADOR
let estado = {
  nombres: { A: "", B: "" },
  goles: { A: 0, B: 0 },
  tiempoPartido: 600,
  tiempoJuego: 1,
  tiempoPosesion: 60,
  pausaTarjetas: false,
  tarjetas: {
    A: { amarilla: [], roja: [], verde: [] },
    B: { amarilla: [], roja: [], verde: [] }}
};

// 🔄 FUNCIONES BD
async function guardarEstadoEnBD() {
  const { error } = await supabase
    .from('marcador_tb')
    .upsert([{
      id: 1,
      equipo_a: estado.nombres.A,
      equipo_b: estado.nombres.B,
      resultado_a: estado.goles.A,
      resultado_b: estado.goles.B,
      rojas_a: JSON.stringify(estado.tarjetas.A.roja),
      rojas_b: JSON.stringify(estado.tarjetas.B.roja),
      amarillas_a: JSON.stringify(estado.tarjetas.A.amarilla),
      amarillas_b: JSON.stringify(estado.tarjetas.B.amarilla),
      verdes_a: JSON.stringify(estado.tarjetas.A.verde),
      verdes_b: JSON.stringify(estado.tarjetas.B.verde),
      tiempo: estado.tiempoPartido,
      fecha: new Date()
    }]);

  if (error) {
    console.error("❌ Error guardando estado:", error.message);
  } else {
    console.log("✅ Estado guardado en Supabase");
  }
}

async function cargarEstadoDesdeBD() {
  const { data, error } = await supabase
    .from('marcador_tb')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("❌ Error cargando estado:", error.message);
    return null;
  }
  if (data) {
    estado = {
      nombres: { A: data.equipo_a, B: data.equipo_b },
      goles: { A: data.resultado_a, B: data.resultado_b },
      tiempoPartido: data.tiempo ,
      tarjetas: {
        A: {
          roja: JSON.parse(data.rojas_a || "[]"),
          amarilla: JSON.parse(data.amarillas_a || "[]"),
          verde: JSON.parse(data.verdes_a || "[]"),

        },
        B: {
          roja: JSON.parse(data.rojas_b || "[]"),
          amarilla: JSON.parse(data.amarillas_b || "[]"),
          verde: JSON.parse(data.verdes_b || "[]"),
        }
      },
    };
    console.log("✅ Estado restaurado desde Supabase");
    return estado;
  }
  return null;
}

// ✅ AÑADE ESTE BLOQUE DESPUÉS DE DEFINIR LA FUNCIÓN
(async () => {
  const estadoBD = await cargarEstadoDesdeBD();
  if (estadoBD) {
    estado = estadoBD;
    console.log("✅ Estado inicial cargado desde BD");
    console.log("Contenido de estadoBD:", estadoBD);

  } else {
    console.log("⚠️ No hay estado previo guardado, usando estado por defecto");
  }
})();

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
    guardarEstadoEnBD();
  });

  socket.on("goles", (data) => {
    estado.goles[data.equipo] = data.goles;
    socket.broadcast.emit("goles", data);
    guardarEstadoEnBD();
  });

  socket.on("cronometroPartido", (data) => {
    estado.tiempoPartido = data.tiempo;
    socket.broadcast.emit("cronometroPartido", data);
    guardarEstadoEnBD();
  });

  socket.on("tiempoJuego", (data) => {
    estado.tiempoJuego = data.tiempo;
    socket.broadcast.emit("tiempoJuego", data);
    guardarEstadoEnBD();
  });

  socket.on("cronometroPosesion", (data) => {
    estado.tiempoPosesion = data.tiempo;
    socket.broadcast.emit("cronometroPosesion", data);
    guardarEstadoEnBD();

  socket.on("reanudarTiempo", () => {
    estado.pausaTarjetas = false;   
    io.emit("reanudarTarjetas");  // 🔁 Reanuda tarjetas en todos
    guardarEstadoEnBD();
  });

  socket.on("pararTiempo", () => {
    estado.pausaTarjetas = true; 
    io.emit("pausarTarjetas");    // ⏸ Pausa tarjetas en todos
    guardarEstadoEnBD();
  });
  });
  // Gestión de tarjetas
  socket.on("tarjeta", (data) => {
    const { equipo, tipo, operacion, nombre } = data;
    if (operacion === "mas") {                                                             // Añade tarjetas con la operación "más"
      estado.tarjetas[equipo][tipo].push({
         nombre: nombre || tipo.toUpperCase(),
         timestamp: Date.now()});      // En tarjetas Rojas y Amarillas se añade también el nombre del jugador
    } else if (operacion === "menos") {
        estado.tarjetas[equipo][tipo].pop();
    }
    socket.broadcast.emit("tarjeta", data);
    guardarEstadoEnBD();
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
        A: { amarilla: [], roja: [], verde: [] },
        B: { amarilla: [], roja: [], verde: [] }
      }
    };
  
    io.emit("estadoCompleto", estado); // Notifica a todos los clientes para actualizar el estado
    guardarEstadoEnBD();
  });  

  socket.on("finalizarPartido", async () => {
    const { error } = await supabase
      .from('marcador_tb')
      .insert([{
        equipo_a: estado.nombres.A,
        equipo_b: estado.nombres.B,
        resultado_a: estado.goles.A,
        resultado_b: estado.goles.B,
        rojas_a: estado.tarjetas.A.roja.length,
        rojas_b: estado.tarjetas.B.roja.length,
        amarillas_a: estado.tarjetas.A.amarilla.length,
        amarillas_b: estado.tarjetas.B.amarilla.length,
        verdes_a: estado.tarjetas.A.verde.lenght,
        verdes_b: estado.tarjetas.B.verde.lenght,
        fecha: new Date()
      }]);

    if (error) {
      console.error("❌ Error al guardar el partido:", error.message);
    } else {
      console.log("✅ Partido guardado correctamente en la base de datos");
    }
    // 🔁 Reiniciar el marcador automáticamente tras finalizar
    console.log("⏹ Reiniciando automáticamente tras finalizar el partido");
    estado = {
      nombres: { A: "", B: "" },
      goles: { A: 0, B: 0 },
      tiempoPartido: 600,
      tiempoJuego: 1,
      tiempoPosesion: 60,
      tarjetas: {
        A: { amarilla: [], roja: [], verde: [] },
        B: { amarilla: [], roja: [], verde: [] }
      }
    };
    io.emit("estadoCompleto", estado);
    guardarEstadoEnBD();
  });
  
});

// ESCUCHA DEL SERVIDOR
const port = process.env.PORT || 3001;
http.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
});