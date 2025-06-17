// VARIABLES
const tarjetas = {                                                                              // Almacenar tarjetas por tipo y equipo
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }};
const tarjetasActivas = [];                                                                     // Almacenamiento de tarjetas con cuenta atrás activa
let tarjetasPausadas = false;                                                                   // Indicar si las banderas están pausadas o no (por defecto)
const socket = io();                                                                            // Iniciar la conexión del cliente al servidor socket.io

// FUNCIONES
function insertarTarjetaOrdenada(contenedor, tarjeta, tipo) {                                   // Ordenar tarjetas
  const titulo = contenedor.children[0];                                                        // El título siempre en primer lugar
  const tarjetasRojas = contenedor.querySelectorAll(".tarjeta-nombre.roja");                    // Selección de tarjetas para posterior colocación
  const tarjetasVerdes = contenedor.querySelectorAll(".tarjeta-nombre.verde");
  if (tipo === "roja") {
    if (tarjetasRojas.length > 0) {                                                             // Insertar justo después del título (rojas)
      contenedor.insertBefore(tarjeta, tarjetasRojas[0]);
    } else {
      contenedor.insertBefore(tarjeta, titulo.nextSibling);}
  } else if (tipo === "verde") {
    contenedor.appendChild(tarjeta);                                                            // Insertar al final (verdes)
  } else {                                                                                      // Entre rojas y verdes (amarillas)
    if (tarjetasVerdes.length > 0) {
      contenedor.insertBefore(tarjeta, tarjetasVerdes[0]);
    } else {
      if (tarjetasRojas.length > 0) {                                                           // Insertar después de las rojas o después del título si no hay rojas
        contenedor.insertBefore(tarjeta, tarjetasRojas[tarjetasRojas.length - 1].nextSibling);
      } else {
        contenedor.insertBefore(tarjeta, titulo.nextSibling);}}}}

function iniciarCuentaAtras(span, contenedor, equipo, tipo, timestamp = Date.now(), pausada = false) {  // Iniciar cuenta atrás
  const tiempoTotal = 120000;                                                                           // Cuenta atrás en milisegundos
  const tarjetaInfo = {                                                                                 // Crea objeto "tarjetaInfo" con los datos de la tarjeta
    intervalo: null,
    timestamp,
    pausadoEn: null,
    span,
    contenedor,
    equipo,
    tipo};
  const getTiempoRestante = () => {                                                                     // Calcular los segundos restantes 
    return Math.max(0, Math.floor((tiempoTotal - (Date.now() - tarjetaInfo.timestamp)) / 1000));};
  const actualizarCuentaAtras = () => {                                                                 // Actualizar el texto del cronómetro
    const tiempoRestante = getTiempoRestante();
    if (tiempoRestante <= 0) {                                                                          // Verificar si el tiempo llega a 0
      clearInterval(tarjetaInfo.intervalo);                                                             // Eliminar el intervalo
      tarjetaInfo.contenedor.remove();                                                                  // Eliminar la tarjeta
      const index = tarjetasActivas.indexOf(tarjetaInfo);
      if (index !== -1) tarjetasActivas.splice(index, 1);
    } else {
      const min = String(Math.floor(tiempoRestante / 60));
      const seg = String(tiempoRestante % 60).padStart(2, "0");
      tarjetaInfo.span.textContent = ` ${min}:${seg}`;}};
  actualizarCuentaAtras();                                                                              // Llamar inmediatamente para mostrar el tiempo desde el inicio
  if (!pausada) {                                                                                       // Si no está pausada comienza la cuenta atrás cada segundo
    tarjetaInfo.intervalo = setInterval(actualizarCuentaAtras, 1000);
  } else {
    tarjetaInfo.pausadoEn = Date.now();}                                                                // Si está pausada, guardamos la marca de pausa inmediatamente
  tarjetasActivas.push(tarjetaInfo);}                                                                   // Añadir la tarjeta al array global de tarjetasActivas

function pausarTodasLasTarjetas() {                                  // Pausar tarjetas activas
  tarjetasActivas.forEach(t => {                                     // Recorrer las tarjetas activas
    if (t.intervalo) {                                               // Verificar si tiene intervalo activo
      clearInterval(t.intervalo); t.intervalo = null;                // Limpiar intervalo
      t.pausadoEn = Date.now();}});}                                 // Registrar con el tiempo actual cuando se pausan

function reanudarTodasLasTarjetas() {                                // Reanudar tarjetas
  tarjetasActivas.forEach(t => {
    if (t.intervalo) return;                                         // Ignorar tarjetas que ya tienen un intervalo
    if (t.pausadoEn) {
      const pausaDuracion = Date.now() - t.pausadoEn;
      t.timestamp += pausaDuracion;                                  // Ajustar el tiempo desplazándolo por el tiempo que estuvieron en pausa
      t.pausadoEn = null;}
    const tiempoTotal = 120000;                                      // Misma lógica que cuenta atrás
    const getTiempoRestante = () => {
      return Math.max(0, Math.floor((tiempoTotal - (Date.now() - t.timestamp)) / 1000));};
    const actualizarCuentaAtras = () => {                            // Actualizar cuenta atrás (Misma lógica)
      const tiempoRestante = getTiempoRestante();
      if (tiempoRestante <= 0) {
        clearInterval(t.intervalo); t.contenedor.remove();
        const index = tarjetasActivas.indexOf(t);
        if (index !== -1) tarjetasActivas.splice(index, 1);
      } else {
        const min = String(Math.floor(tiempoRestante / 60));
        const seg = String(tiempoRestante % 60).padStart(2, "0");
        t.span.textContent = ` ${min}:${seg}`;}};
    actualizarCuentaAtras();                                        // Actualiza inmediatamente al reanudar
    t.intervalo = setInterval(actualizarCuentaAtras, 1000);});}     // Lanzar el contador otra vez con intervalo

// ESCUCHAS AL SERVIDOR
socket.emit("solicitarEstado");                                             // Enviar solicitud al servidor para recibir estado completo 
socket.on("estadoCompleto", (estado) => {                                   // Escuchar la respuesta del servidor
  document.getElementById("nombreEquipoA").textContent = estado.nombres.A;  // Mostrar nombres
  document.getElementById("nombreEquipoB").textContent = estado.nombres.B;
  document.getElementById("resultadoA").textContent = estado.goles.A;       // Mostrar resultado
  document.getElementById("resultadoB").textContent = estado.goles.B;

  ["A", "B"].forEach(equipo => {                                                                     // Iterar por cada equipo para obtener lista de goleadores
    const goleadoresContenedor = document.getElementById(`goleadores${equipo}`);
    Array.from(goleadoresContenedor.querySelectorAll(".goleador-item")).forEach(el => el.remove());  // Borrar goleadores previos para evitar duplicados
    Object.entries(estado.goleadores[equipo]).forEach(([nombre, tiempos]) => {                       // Mostrar goleadores
      const item = document.createElement("div");                                                    // Crear div para mostrar nombre y tiempo de goles
      item.className = "goleador-item";
      item.dataset.nombre = nombre;
      const formatearTiempos = (tiempos) => {                                                        // Convertir segundos en formato MM:SS
        return tiempos.map(segundos => {
          let min = Math.floor(segundos / 60);
          let seg = segundos % 60;
          return `${min}:${seg.toString().padStart(2, '0')}`;
        }).join(', ');};                                                                             // Junta con una coma los minutos y segundos
      item.textContent = `${nombre}: ${tiempos.length} (${formatearTiempos(tiempos)})`;              // Mostrar nombre, goles y tiempos formateados para añadir al DOM
      goleadoresContenedor.appendChild(item);});});
  let min = Math.floor(estado.tiempoPartido / 60);                                                   // Mostrar tiempo actual del partido en formato MM:SS
  let seg = estado.tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };                    // Traducir el estado del tiempo de juego (1, 2, 3) a texto
  document.getElementById("tiempo-juego").textContent = tiempoTexto[estado.tiempoJuego];
  document.getElementById("tiempoPosesion").textContent = estado.tiempoPosesion;                     // Mostrar tiempo de posesión actual
  ["A", "B"].forEach(equipo => {                                                                     // Recorrer cada equipo y limpiar el contenedor de tarjetas
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  contenedor.innerHTML = "";   
  const titulo = document.createElement("h3");                                                       // Agregar título "Expulsiones" al contenedor
  titulo.className = "te";
  titulo.textContent = "EXPULSIONES";
  contenedor.appendChild(titulo);
  ["amarilla", "roja", "verde"].forEach(tipo => {                                                    // Iterar por tipo de tarjeta
    const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
    tarjetas[equipo][tipo] = [];                                                                     // Reiniciar array correspondiente
    estado.tarjetas[equipo][tipo].forEach(data => {                                                  // Recorrer tarjetas activas de ese tipo y equipo
      const tarjeta = document.createElement("div");                                                 // Crear div para nombre del jugador
      tarjeta.className = `tarjeta-nombre ${tipo}`;                                                  // Agregar nombre del jugador al div
      const nombre = document.createElement("span");                                                 // Crear span para nombre de jugador
      nombre.textContent = data.nombre;                                                              // Agregar nombre de jugador a span
      tarjeta.appendChild(nombre);
      const span = document.createElement("span");                                                   // Incluir temporizador
      tarjeta.appendChild(span);
      iniciarCuentaAtras(span, tarjeta, equipo, tipo, data.timestamp, tarjetasPausadas);
      insertarTarjetaOrdenada(contenedor, tarjeta, tipo);
      tarjetas[equipo][tipo].push(tarjeta);});
    if (cantidad) {                                                                                  // Actualiza número de tarjetas visibles
      cantidad.textContent = tarjetas[equipo][tipo].length;}});});});
// Actualizaciones en tiempo real
socket.on("nombreEquipo", (data) => {                                                                     // Cambiar nombre de equipo
  const equipo = data.equipo;
  const nombre = data.nombre;
  document.getElementById(equipo === "A" ? "nombreEquipoA" : "nombreEquipoB").textContent = nombre;});

socket.on("goles", (data) => {                                                                            // Actualizar goles
  document.getElementById(data.equipo === "A" ? "resultadoA" : "resultadoB").textContent = data.goles;});

socket.on("goleador", ({ equipo, nombre, goles, tiempos }) => {                                           // Actualizar goleadores
  const contenedor = document.getElementById(`goleadores${equipo}`);
  let existente = Array.from(contenedor.getElementsByClassName("goleador-item"))
    .find(el => el.dataset.nombre === nombre);                                                            // Buscar si el goleador ya existe
  const formatearTiempos = (tiempos) => {                                                                 // Formatear tiempos de gol (Arriba explicado)
    return tiempos.map(segundos => {
      let min = Math.floor(segundos / 60);
      let seg = segundos % 60;
      return `${min}:${seg.toString().padStart(2, '0')}`;
    }).join(', ');};
  if (goles === 0) {                                                                                      // Verificar si goles es 0
    if (existente) existente.remove();                                                                    // Eliminar nombre
  } else {
    if (existente) {                                                                                      // Actualizar nombre
      existente.textContent = `${nombre}: ${goles} (${formatearTiempos(tiempos)})`;
    } else {                                                                                              // Crear nuevo nombre
      const nuevo = document.createElement("div");
      nuevo.className = "goleador-item";
      nuevo.dataset.nombre = nombre;
      nuevo.textContent = `${nombre}: ${goles} (${formatearTiempos(tiempos)})`;
      contenedor.appendChild(nuevo);}}});

socket.on("cronometroPartido", (data) => {                                                                // Cronómetro de partido
  let minutos = Math.floor(data.tiempo / 60);
  let segundos = data.tiempo % 60;
  document.getElementById("tiempoPartido").textContent = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;});

socket.on("tiempoJuego", (data) => {                                                                      // Tiempo de juego
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[data.tiempo];});

socket.on("cronometroPosesion", (data) => {                                                               // Cronómetro de posesión
  const el = document.getElementById("tiempoPosesion");
  el.textContent = data.tiempo;});

socket.on("tarjeta", (data) => {                                                                          // Extraer datos de tarjetas por tipo, etc
  const { equipo, tipo, operacion, nombre } = data;
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);                                // Localizar contenedor de tarjetas
  const lista = tarjetas[equipo][tipo];                                                                   // Localizar lista de tarjetas
  if (operacion === "mas") {                                                                              // Añadir tarjeta al DOM y gestionar en arrays
    const tarjeta = document.createElement("div");
    tarjeta.className = `tarjeta-nombre ${tipo}`;
    const spanNombre = document.createElement("span");
    spanNombre.textContent = nombre || tipo.toUpperCase();
    tarjeta.appendChild(spanNombre);
    const spanTiempo = document.createElement("span");
    tarjeta.appendChild(spanTiempo);
    iniciarCuentaAtras(spanTiempo, tarjeta, equipo, tipo, data.timestamp);
    insertarTarjetaOrdenada(contenedor, tarjeta, tipo);
    lista.push(tarjeta);
    cantidad.textContent = lista.length;
    } else if (operacion === "menos" && lista.length > 0) {                                               // Eliminar última tarjeta al pulsar restar
      const tarjeta = lista.pop();
      if (tarjeta) tarjeta.remove();}});
  
socket.on("pausarTarjetas", () => {                                                                       // Pausar tarjetas
  tarjetasPausadas = true;
  pausarTodasLasTarjetas();});

socket.on("reanudarTarjetas", () => {                                                                     // Reanudar tarjetas
  tarjetasPausadas = false;
  reanudarTodasLasTarjetas();});

// GENERACION QR
new QRCode(document.getElementById("QR"), {                                                               // Crear código QR de la pantalla de visualización "index2.html"
  text: "https://marcadorkp.onrender.com/index2.html",});                                                 // Mostrar URL del QR