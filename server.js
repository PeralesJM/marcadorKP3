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
    res.send("Acceso denegado. Contraseña incorrecta.");}});

// FUNCIONES
function obtenerEstadoInicial(prevEstado = {}) {
  if (prevEstado?.intervaloPartido) clearInterval(prevEstado.intervaloPartido);
  if (prevEstado?.intervaloPosesion) clearInterval(prevEstado.intervaloPosesion);
  return { nombres: { A: "", B: "" },
           goles: { A: 0, B: 0 },
           tiempoPartido: 600,
           intervaloPartido: null,
           tiempoJuego: 1,
           tiempoPosesion: 60,
           intervaloPosesion: null,
           pausaTarjetas: false,
           goleadores: { A: {}, B: {} },
           contadorTarjetas: { A: { amarilla: 0, roja: 0, verde: 0 },
                               B: { amarilla: 0, roja: 0, verde: 0 }},
           tarjetas: { A: { amarilla: [], roja: [], verde: [] },
                       B: { amarilla: [], roja: [], verde: [] }}};}

let estado = obtenerEstadoInicial();

async function guardarEstadoEnBD() {
  const { error } = await supabase
    .from('marcador_tb')
    .upsert([{
      id: 1,
      equipo_a: estado.nombres.A,
      equipo_b: estado.nombres.B,
      resultado_a: estado.goles.A,
      resultado_b: estado.goles.B,
      rojas_a: estado.contadorTarjetas?.A.roja || 0,
      rojas_b: estado.contadorTarjetas?.B.roja || 0,
      amarillas_a: estado.contadorTarjetas?.A.amarilla || 0,
      amarillas_b: estado.contadorTarjetas?.B.amarilla || 0,
      verdes_a: estado.contadorTarjetas?.A.verde || 0,
      verdes_b: estado.contadorTarjetas?.B.verde || 0,
      tiempo: estado.tiempoPartido,
      fecha: new Date()}]);}

async function cargarEstadoDesdeBD() {
  const { data, error } = await supabase
    .from('marcador_tb')
    .select('*')
    .eq('id', 1)
    .single();
  if (data) {
    estado = {
      nombres: { A: data.equipo_a, B: data.equipo_b },
      goles: { A: data.resultado_a, B: data.resultado_b },
      tiempoPartido: data.tiempo,
      pausaTarjetas: false,
      tiempoJuego: 1,
      tiempoPosesion: 60,
      goleadores: { A: {}, B: {} },
      tarjetas: { A: { roja: [], amarilla: [], verde: [] },
                  B: { roja: [], amarilla: [], verde: [] }},
      contadorTarjetas: { A: { roja: data.rojas_a || 0,
                               amarilla: data.amarillas_a || 0,
                               verde: data.verdes_a || 0},
                          B: { roja: data.rojas_b || 0,
                               amarilla: data.amarillas_b || 0,
                               verde: data.verdes_b || 0}}};
    return estado;}
  return null;}
(async () => {
  const estadoBD = await cargarEstadoDesdeBD();
  if (estadoBD) {
    estado = estadoBD;}})();

// CONEXION DE CLIENTES (Socket.on escucha cada evento del cliente, Socket.emit devuelve eventos con los datos actualizados)
io.on("connection", (socket) => {                            // Se ejecuta cuando un cliente se conecta al servidor a través de Socket.io
  console.log("Nuevo cliente conectado");
  
  socket.on("solicitarEstado", () => socket.emit("estadoCompleto", estado));

  socket.on('nombreEquipo', (data) => {
    estado.nombres[data.equipo] = data.nombre;
    io.emit('nombreEquipo', data);
    guardarEstadoEnBD();});

  socket.on("goles", (data) => {
    estado.goles[data.equipo] = data.goles;
    socket.broadcast.emit("goles", data);
    guardarEstadoEnBD();});

  socket.on("goleador", ({ equipo, nombre }) => {
    estado.goleadores[equipo][nombre] = (estado.goleadores[equipo][nombre] || 0) + 1;
    socket.broadcast.emit("goleador", { equipo, nombre, goles: estado.goleadores[equipo][nombre] });
    guardarEstadoEnBD();});

  socket.on("cronometroPartido", (data) => {
    estado.tiempoPartido = data.tiempo;
    socket.broadcast.emit("cronometroPartido", data);
    guardarEstadoEnBD();});

  socket.on("tiempoJuego", (data) => {
    estado.tiempoJuego = data.tiempo;
    socket.broadcast.emit("tiempoJuego", data);
    guardarEstadoEnBD();});

  socket.on("cronometroPosesion", (data) => {
    estado.tiempoPosesion = data.tiempo;
    socket.broadcast.emit("cronometroPosesion", data);
    guardarEstadoEnBD();});

  socket.on("reanudarTiempo", () => {
    estado.pausaTarjetas = false;   
    io.emit("reanudarTarjetas");
    guardarEstadoEnBD();});

  socket.on("pararTiempo", () => {
    estado.pausaTarjetas = true; 
    io.emit("pausarTarjetas");
    guardarEstadoEnBD();});
  
  socket.on("tarjeta", (data) => {                                     // Gestión de tarjetas
    const { equipo, tipo, operacion, nombre, conteo } = data;
    if (operacion === "mas") {                                         // Añade tarjetas con la operación "más"
      estado.tarjetas[equipo][tipo].push({
         nombre: nombre || tipo.toUpperCase(),
         timestamp: Date.now()});
    } else if (operacion === "menos") {
        estado.tarjetas[equipo][tipo].pop();}
    if (conteo) {
      estado.contadorTarjetas = conteo;}
    socket.broadcast.emit("tarjeta", data);
    guardarEstadoEnBD();});
  
  socket.on("disconnect", () => {                                      // Desconexión del cliente
    console.log("Cliente desconectado");});

  socket.on("reiniciarMarcador", () => {                               // Reinicio marcador
    console.log("Marcador reiniciado desde el panel de control");
    estado = obtenerEstadoInicial(estado);
    io.emit("estadoCompleto", estado);                                 // Notifica a todos los clientes para actualizar el estado
    guardarEstadoEnBD();});  

  socket.on("finalizarPartido", async () => {
    const { error } = await supabase
      .from('marcador_tb')
      .insert([{
        equipo_a: estado.nombres.A,
        equipo_b: estado.nombres.B,
        resultado_a: estado.goles.A,
        resultado_b: estado.goles.B,
        rojas_a: estado.contadorTarjetas.A.roja,
        rojas_b: estado.contadorTarjetas.B.roja,
        amarillas_a: estado.contadorTarjetas.A.amarilla,
        amarillas_b: estado.contadorTarjetas.B.amarilla,
        verdes_a: estado.contadorTarjetas.A.verde,
        verdes_b: estado.contadorTarjetas.B.verde,
        tiempo: estado.tiempo,
        fecha: new Date()}]);
    if (error) {
      console.error("❌ Error al guardar el partido:", error.message);
    } else {
      console.log("✅ Partido guardado correctamente en la base de datos");}   
    estado = obtenerEstadoInicial(estado);
    io.emit("estadoCompleto", estado);
    guardarEstadoEnBD();});});

const port = process.env.PORT || 3001;                                         // Escucha del servidor
http.listen(port, () => {console.log(`Servidor en puerto ${port}`);});