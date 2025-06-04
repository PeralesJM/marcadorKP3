// VARIABLES
const tarjetas = {
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }};
const tarjetasActivas = [];
let tarjetasPausadas = false;
const socket = io();

// FUNCIONES
function insertarTarjetaOrdenada(contenedor, tarjeta, tipo) {
  const titulo = contenedor.children[0];                                                        // El título siempre en primer lugar
  const tarjetasRojas = contenedor.querySelectorAll(".tarjeta-nombre.roja");
  const tarjetasVerdes = contenedor.querySelectorAll(".tarjeta-nombre.verde");
  if (tipo === "roja") {
    if (tarjetasRojas.length > 0) {                                                             // Insertar justo después del título y antes de otras rojas
      contenedor.insertBefore(tarjeta, tarjetasRojas[0]);
    } else {
      contenedor.insertBefore(tarjeta, titulo.nextSibling);}
  } else if (tipo === "verde") {
    contenedor.appendChild(tarjeta);                                                            // Insertar al final
  } else {                                                                                      // amarilla
    if (tarjetasVerdes.length > 0) {
      contenedor.insertBefore(tarjeta, tarjetasVerdes[0]);
    } else {
      if (tarjetasRojas.length > 0) {                                                           // Insertar después de las rojas o después del título si no hay rojas
        contenedor.insertBefore(tarjeta, tarjetasRojas[tarjetasRojas.length - 1].nextSibling);
      } else {
        contenedor.insertBefore(tarjeta, titulo.nextSibling);}}}}

function iniciarCuentaAtras(span, contenedor, equipo, tipo, timestamp = Date.now(), pausada = false) {
  const tiempoTotal = 120000;
  const tarjetaInfo = {
    intervalo: null,
    timestamp,
    pausadoEn: null,
    span,
    contenedor,
    equipo,
    tipo};
  const getTiempoRestante = () => {
    return Math.max(0, Math.floor((tiempoTotal - (Date.now() - tarjetaInfo.timestamp)) / 1000));};
  const actualizarCuentaAtras = () => {
    const tiempoRestante = getTiempoRestante();
    if (tiempoRestante <= 0) {
      clearInterval(tarjetaInfo.intervalo);
      tarjetaInfo.contenedor.remove();
      const index = tarjetasActivas.indexOf(tarjetaInfo);
      if (index !== -1) tarjetasActivas.splice(index, 1);
    } else {
      const min = String(Math.floor(tiempoRestante / 60));
      const seg = String(tiempoRestante % 60).padStart(2, "0");
      tarjetaInfo.span.textContent = ` ${min}:${seg}`;}};
  actualizarCuentaAtras();
  if (!pausada) {
    tarjetaInfo.intervalo = setInterval(actualizarCuentaAtras, 1000);
  } else {
    tarjetaInfo.pausadoEn = Date.now();}                              // Si está pausada, guardamos la marca de pausa inmediatamente
  tarjetasActivas.push(tarjetaInfo);}

function pausarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => {
    if (t.intervalo) {
      clearInterval(t.intervalo); t.intervalo = null;
      t.pausadoEn = Date.now();}});}

function reanudarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => {
    if (t.intervalo) return;                                         // Si ya hay un intervalo activo, no hacer nada
    if (t.pausadoEn) {
      const pausaDuracion = Date.now() - t.pausadoEn;
      t.timestamp += pausaDuracion;
      t.pausadoEn = null;}
    const tiempoTotal = 120000;
    const getTiempoRestante = () => {
      return Math.max(0, Math.floor((tiempoTotal - (Date.now() - t.timestamp)) / 1000));};
    const actualizarCuentaAtras = () => {
      const tiempoRestante = getTiempoRestante();
      if (tiempoRestante <= 0) {
        clearInterval(t.intervalo); t.contenedor.remove();
        const index = tarjetasActivas.indexOf(t);
        if (index !== -1) tarjetasActivas.splice(index, 1);
      } else {
        const min = String(Math.floor(tiempoRestante / 60));
        const seg = String(tiempoRestante % 60).padStart(2, "0");
        t.span.textContent = ` ${min}:${seg}`;}};
    actualizarCuentaAtras();                                      // Actualiza inmediatamente al reanudar
    t.intervalo = setInterval(actualizarCuentaAtras, 1000);});}

// ESCUCHAS AL SERVIDOR
socket.emit("solicitarEstado");
socket.on("estadoCompleto", (estado) => {
  document.getElementById("nombreEquipoA").textContent = estado.nombres.A;
  document.getElementById("nombreEquipoB").textContent = estado.nombres.B;
  document.getElementById("resultadoA").textContent = estado.goles.A;
  document.getElementById("resultadoB").textContent = estado.goles.B;

  ["A", "B"].forEach(equipo => {
    const goleadoresContenedor = document.getElementById(`goleadores${equipo}`);
    Array.from(goleadoresContenedor.querySelectorAll(".goleador-item")).forEach(el => el.remove());  // Borrar anteriores
    Object.entries(estado.goleadores[equipo]).forEach(([nombre, tiempos]) => {                         // Mostrar goleadores
      const item = document.createElement("div");
      item.className = "goleador-item";
      item.dataset.nombre = nombre;
      const formatearTiempos = (tiempos) => {
        return tiempos.map(segundos => {
          let min = Math.floor(segundos / 60);
          let seg = segundos % 60;
          return `${min}:${seg.toString().padStart(2, '0')}`;
        }).join(', ');};
      item.textContent = `${nombre}: ${tiempos.length} (${formatearTiempos(tiempos)})`;
      goleadoresContenedor.appendChild(item);});});
  let min = Math.floor(estado.tiempoPartido / 60);
  let seg = estado.tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[estado.tiempoJuego];
  document.getElementById("tiempoPosesion").textContent = estado.tiempoPosesion;
  ["A", "B"].forEach(equipo => {
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  contenedor.innerHTML = "";   
  const titulo = document.createElement("h3");
  titulo.className = "te";
  titulo.textContent = "EXPULSIONES";
  contenedor.appendChild(titulo);                                             // Limpiar una sola vez por equipo
  ["amarilla", "roja", "verde"].forEach(tipo => {
    const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
    tarjetas[equipo][tipo] = [];
    estado.tarjetas[equipo][tipo].forEach(data => {
      const tarjeta = document.createElement("div");
      tarjeta.className = `tarjeta-nombre ${tipo}`;
      const nombre = document.createElement("span");
      nombre.textContent = data.nombre;
      tarjeta.appendChild(nombre);
      const span = document.createElement("span");                          // Siempre incluir temporizador, sin importar el tipo
      tarjeta.appendChild(span);
      iniciarCuentaAtras(span, tarjeta, equipo, tipo, data.timestamp, tarjetasPausadas);
      insertarTarjetaOrdenada(contenedor, tarjeta, tipo);
      tarjetas[equipo][tipo].push(tarjeta);});
    if (cantidad) {
      cantidad.textContent = tarjetas[equipo][tipo].length;}});});});

socket.on("nombreEquipo", (data) => {
  const equipo = data.equipo;
  const nombre = data.nombre;
  document.getElementById(equipo === "A" ? "nombreEquipoA" : "nombreEquipoB").textContent = nombre;});

socket.on("goles", (data) => {
  document.getElementById(data.equipo === "A" ? "resultadoA" : "resultadoB").textContent = data.goles;});

socket.on("goleador", ({ equipo, nombre, goles, tiempos }) => {
  const contenedor = document.getElementById(`goleadores${equipo}`);
  let existente = Array.from(contenedor.getElementsByClassName("goleador-item"))
    .find(el => el.dataset.nombre === nombre);
  const formatearTiempos = (tiempos) => {
    return tiempos.map(segundos => {
      let min = Math.floor(segundos / 60);
      let seg = segundos % 60;
      return `${min}:${seg.toString().padStart(2, '0')}`;
    }).join(', ');};
  if (goles === 0) {
    if (existente) existente.remove();
  } else {
    if (existente) {
      existente.textContent = `${nombre}: ${goles} (${formatearTiempos(tiempos)})`;
    } else {
      const nuevo = document.createElement("div");
      nuevo.className = "goleador-item";
      nuevo.dataset.nombre = nombre;
      nuevo.textContent = `${nombre}: ${goles} (${formatearTiempos(tiempos)})`;
      contenedor.appendChild(nuevo);}}});

socket.on("cronometroPartido", (data) => {
  let minutos = Math.floor(data.tiempo / 60);
  let segundos = data.tiempo % 60;
  document.getElementById("tiempoPartido").textContent = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;});

socket.on("tiempoJuego", (data) => {
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[data.tiempo];});

socket.on("cronometroPosesion", (data) => {
  const el = document.getElementById("tiempoPosesion");
  el.textContent = data.tiempo;});

socket.on("tarjeta", (data) => {
  const { equipo, tipo, operacion, nombre } = data;
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  const lista = tarjetas[equipo][tipo];
  if (operacion === "mas") {
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
    } else if (operacion === "menos" && lista.length > 0) {
      const tarjeta = lista.pop();
      if (tarjeta) tarjeta.remove();}});
  
socket.on("pausarTarjetas", () => {
  tarjetasPausadas = true;
  pausarTodasLasTarjetas();});

socket.on("reanudarTarjetas", () => {
  tarjetasPausadas = false;
  reanudarTodasLasTarjetas();});

// GENERACION QR
new QRCode(document.getElementById("QR"), {
  text: "https://marcadorkp.onrender.com/index2.html",});