// IMPORTACION MODULOS
const servidorId = "server1";                                // Identificador del servidor
const express = require("express");                          // Framework para crear servidores web en Node.js
const app = express();                                       // Crear instancia de aplicación app
const http = require("http").createServer(app);              // Crear servidor HTTP usando esa instancia
const io = require("socket.io")(http);                       // Conectar Socket.io al servidor HTTP para comunicación en tiempo real con sockets
app.use(express.static("public"));                           // Acceso a archivos estáticos desde "public"

// CONEXION BASE DE DATOS
const { createClient } = require('@supabase/supabase-js');   // Importar función createClient para interactuar con la base de datos de Supabase
const supabaseUrl = process.env.SUPABASE_URL;                // Extraer URL del proyecto para conectarse a la BD
const supabaseKey = process.env.SUPABASE_KEY;                // Extraer contraseña
const supabase = createClient(supabaseUrl, supabaseKey);     // Crear cliente de Supabase para leer y escribir datos con esa URL y contraseña

// CONTRASEÑA
const contrasena = "1234";
app.get("/index_pc.html", (req, res) => {                    // Ruta GET para acceder a index_pc.html con contraseña
  const contraseñaUsuario = req.query.password;              // Añadir password
  if (contraseñaUsuario === contrasena) {                    // Verificar si password coincide con la contraseña esperada
    res.sendFile(__dirname + "/public/index_pc.html");       // En caso afirmativo se dirige a esa ruta
  } else {
    res.send("Acceso denegado. Contraseña incorrecta.");}}); // De lo contrario se envía mensaje de contraseña incorrecta

// FUNCIONES
function obtenerEstadoInicial(prevEstado = {}) {                                  // Devolver objeto con estado inicial del marcador
  if (prevEstado?.intervaloPartido) clearInterval(prevEstado.intervaloPartido);   // Limpia el intervalo del cronómetro de partido para evitar duplicidades
  if (prevEstado?.intervaloPosesion) clearInterval(prevEstado.intervaloPosesion); // Limpia el intervalo del cronómetro de posesión para evitar duplicidades
  return { nombres: { A: "", B: "" },
           goles: { A: 0, B: 0 },
           tiempoPartido: 600,
           intervaloPartido: null,
           tiempoJuego: 1,
           tiempoPosesion: 60,
           intervaloPosesion: null,
           pausaTarjetas: false,
           goleadores: { A: {}, B: {} },
           historialGoleadores: { A: [], B: []},                                  // Orden de goleadores, para poder eliminar el último
           contadorTarjetas: { A: { amarilla: 0, roja: 0, verde: 0 },
                               B: { amarilla: 0, roja: 0, verde: 0 }},
           tarjetas: { A: { amarilla: [], roja: [], verde: [] },
                       B: { amarilla: [], roja: [], verde: [] }}};}
let estado = obtenerEstadoInicial();                                              // Crear variable globar "estado" con el estado actual del partido

async function guardarEstadoEnBD() {                                              // Función asincrónica que guarda el estado en Supabase
  const construirGoleadores = (equipo) => {                                       // Genera el formato de goleadores (número de goles y tiempos)
    const resultado = {};
    const goleadores = estado.goleadores[equipo];
    for (const nombre in goleadores) {
      resultado[nombre] = {
        goles: goleadores[nombre].length,
        tiempos: goleadores[nombre]};}
    return resultado;};
  const goleadoresA = construirGoleadores("A");                                   // Construir objetos con información de goleadores
  const goleadoresB = construirGoleadores("B");
  const { error } = await supabase
    .from('marcador_tb')
    .upsert([{                                                                    // Actualizar el estado de la tabla "marcador_tb"
      id: 1,                                                                      // Solo se gestiona un registro con id=1
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
      fecha: new Date(),
      goleadores_a: goleadoresA,
      goleadores_b: goleadoresB}]);}

async function cargarEstadoDesdeBD() {                                            // Leer de Supabase el estado guardado con id=1
  const { data, error } = await supabase
    .from('marcador_tb')
    .select('*')
    .eq('id', 1)
    .single();
  if (data) {                                                                     // Reconstruir el estado local si se encuentra información en la BD
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
(async () => {                                                                    // Función anónima autoejecutable que carga el estado desde Supabase al arrancar el servidor
  const estadoBD = await cargarEstadoDesdeBD();
  if (estadoBD) {
    estado = estadoBD;}})();

// CONEXION DE CLIENTES (Socket.on escucha cada evento del cliente, Socket.emit devuelve eventos con los datos actualizados)
io.on("connection", (socket) => {                                                     // Se ejecuta cuando un cliente (socket) se conecta al servidor a través de Socket.io
  console.log("Nuevo cliente conectado");                                             // Mensaje de conexión exitosa
  
  socket.on("solicitarEstado", () => socket.emit("estadoCompleto", estado));          // Cuando un cliente solicita el estadoCompleto se le envía solo a el

  socket.on('nombreEquipo', (data) => {                                               // Cambio de nombre
    estado.nombres[data.equipo] = data.nombre;                                        // Se guarda el nombre en estado.nombres
    io.emit('nombreEquipo', data);                                                    // Reenviar el nuevo nombre a todos los clientes que lo soliciten
    guardarEstadoEnBD();});                                                           // Guarda el estado en la base de datos

  socket.on("goles", (data) => {                                                      // Actualizar los goles
    estado.goles[data.equipo] = data.goles;
    socket.broadcast.emit("goles", data);                                             // Reenviar a todos menos el que lo envió para que no se dupliquen
    guardarEstadoEnBD();});

  socket.on("goleador", ({ equipo, nombre }) => {                                     // Registrar goleadores
    if (equipo !== "A" && equipo !== "B") return;                                     // Verificar que el equipo es válido
    const tiempoReal = 600 - estado.tiempoPartido;                                    // Calcular el tiempo del gol restándole al total el actual
    const offsetMinutos = (estado.tiempoJuego - 1) * 10;                              // Sumar los minutos dependiendo del tiempo de juego
    const totalSegundos = tiempoReal + offsetMinutos * 60;                            // Almacenar como segundos
    if (!estado.goleadores[equipo][nombre]) {                                         // Se inicializa un jugador si no estaba registrado
      estado.goleadores[equipo][nombre] = [];}
    estado.goleadores[equipo][nombre].push(totalSegundos);                            // Agregar tiempo del gol
    if (!estado.historialGoleadores) estado.historialGoleadores = { A: [], B: [] };   
    if (!estado.historialGoleadores[equipo]) estado.historialGoleadores[equipo] = []; // Eliminar el último gol
    estado.historialGoleadores[equipo].push(nombre);                                  // Añadir el nombre al historial
    socket.broadcast.emit("goleador", { equipo,                                       // Enviar la información actualizada del goleador
                                        nombre,
                                        goles: estado.goleadores[equipo][nombre].length,
                                        tiempos: estado.goleadores[equipo][nombre],});
    guardarEstadoEnBD();});

  socket.on("eliminarUltimoGoleador", ({ equipo }) => {                               // Eliminar último goleador
    const historial = estado.historialGoleadores[equipo];
    if (!historial || historial.length === 0) return;                                 // Verificar si hay historial para poder eliminar
    const ultimo = historial.pop();                                                   // Eliminar el último gol registrado del jugador
    if (estado.goleadores[equipo][ultimo]) {
      estado.goleadores[equipo][ultimo].pop();                                        // Si no hay mas goles, eliminar el jugador
      if (estado.goleadores[equipo][ultimo].length === 0) {
        delete estado.goleadores[equipo][ultimo];}
      socket.broadcast.emit("goleador", { equipo,                                     // Reenviar el estado actualizado del jugador eliminado
                                          nombre: ultimo,
                                          goles: estado.goleadores[equipo][ultimo]?.length || 0,
                                          tiempos: estado.goleadores[equipo][ultimo] || []});
      guardarEstadoEnBD();}});

  socket.on("cronometroPartido", (data) => {                           // Tiempo de cronómetro del partido
    estado.tiempoPartido = data.tiempo;                                // Guardar el tiempo actual
    socket.broadcast.emit("cronometroPartido", data);                  // Emitir solo al resto de clientes para evitar duplicidades
    guardarEstadoEnBD();});

  socket.on("tiempoJuego", (data) => {                                 // Tiempo de juego (Primer tiempo, Segundo Tiempo, etc)
    estado.tiempoJuego = data.tiempo;
    socket.broadcast.emit("tiempoJuego", data);
    guardarEstadoEnBD();});

  socket.on("cronometroPosesion", (data) => {                          // Cronómetro de posesión
    estado.tiempoPosesion = data.tiempo;
    socket.broadcast.emit("cronometroPosesion", data);
    guardarEstadoEnBD();});

  socket.on("reanudarTiempo", () => {                                  // Reanudar cuenta atrás de las tarjetas
    estado.pausaTarjetas = false;   
    io.emit("reanudarTarjetas");
    guardarEstadoEnBD();});

  socket.on("pararTiempo", () => {                                     // Pausar cuenta atrás de las tarjetas
    estado.pausaTarjetas = true; 
    io.emit("pausarTarjetas");
    guardarEstadoEnBD();});
  
  socket.on("tarjeta", (data) => {                                     // Gestión de tarjetas
    const { equipo, tipo, operacion, nombre, conteo } = data;          // Recibir datos de una tarjeta
    if (operacion === "mas") {                                         // Añade tarjetas con la operación "más"
      estado.tarjetas[equipo][tipo].push({
         nombre: nombre || tipo.toUpperCase(),
         timestamp: Date.now()});
    } else if (operacion === "menos") {
        estado.tarjetas[equipo][tipo].pop();}
    if (conteo) {                                                      // Verificar conteo para actualizar el contador
      estado.contadorTarjetas = conteo;}
    socket.broadcast.emit("tarjeta", data);                            // Envíar solo al resto de clientes para evitar duplicidades
    guardarEstadoEnBD();});
  
  socket.on("disconnect", () => {                                      // Desconexión del cliente
    console.log("Cliente desconectado");});                            // Mensaje de desconexión del cliente

  socket.on("reiniciarMarcador", () => {                               // Reinicio marcador
    console.log("Marcador reiniciado desde el panel de control");
    estado = obtenerEstadoInicial(estado);
    io.emit("estadoCompleto", estado);                                 // Notifica a todos los clientes para actualizar el estado
    guardarEstadoEnBD();});  

  socket.on("finalizarPartido", async () => {                          // Finalizar partido. Guarda registros en base de datos en otro id
    const construirGoleadores = (equipo) => {                          // Construir datos de goleadores (nombre, número de goles, tiempos)
      const resultado = {};
      const goleadores = estado.goleadores[equipo];
      for (const nombre in goleadores) {
        resultado[nombre] = {
          goles: goleadores[nombre].length,
          tiempos: goleadores[nombre]};}
      return resultado;};
    const goleadoresA = construirGoleadores("A");                      // Extraer los datos para cada equipo
    const goleadoresB = construirGoleadores("B");
    const { error } = await supabase                                   // Insertar datos en Supabase
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
        fecha: new Date(),
        goleadores_a: goleadoresA,
        goleadores_b: goleadoresB}]);
    if (error) {
      console.error("❌ Error al guardar el partido:", error.message);         // Mensaje de error al guardar
    } else {
      console.log("✅ Partido guardado correctamente en la base de datos");}   // Mensaje en caso de éxito
    estado = obtenerEstadoInicial(estado);                                      // Reiniciar el estado al guardar el partido
    io.emit("estadoCompleto", estado);
    guardarEstadoEnBD();});});

const port = process.env.PORT || 3001;                                         // Arrancar el servidor en ese puerto
http.listen(port, () => {console.log(`Servidor en puerto ${port}`);});