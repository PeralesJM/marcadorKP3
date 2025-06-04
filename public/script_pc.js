// VARIABLES
let golesA = 0, golesB = 0;                                                 // Resultado
let tiempoPartido = 600; let intervaloPartido = null;                       // Cronómetro del partido con intervalo
let tiempoPosesion = 60; let intervaloPosesion = null;                      // Cronómetro de posesión
const socket = io();                                                        // Conexión al servidor socket.io
const tarjetas = {                                                          // Tarjetas
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }};
const tarjetasActivas = [];                                                 // Gestión tarjetas activas
const contadorTarjetas = {                                                  // Conteo de tarjetas totales (Solo para el árbitro)
  A: { roja: 0, amarilla: 0, verde: 0 },
  B: { roja: 0, amarilla: 0, verde: 0 },};

// CONTROLES
// Selección de inputs + Llamada a función para manejar nombres de equipos
const equipoAInput = document.getElementById('equipoA'); manejarNombreEquipo(equipoAInput, 'A');
const equipoBInput = document.getElementById('equipoB'); manejarNombreEquipo(equipoBInput, 'B');

// Goles y goleadores
document.getElementById("golA-mas").onclick = () => {
  const botones = document.getElementById("botonesA");
  if (document.getElementById("inputGoleadorA")) return;                      // Evita que se añadan varios inputs si ya hay uno
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Nombre del goleador";
  input.id = "inputGoleadorA";
  input.className = "input-goleador";
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const nombre = input.value.trim();
      golesA++;
      actualizarResultado();
      socket.emit("goles", { equipo: "A", goles: golesA });
      if (nombre !== "") {
        const tiempoGol = 600 - tiempoPartido;
        socket.emit("goleador", { equipo: "A", nombre, tiempo: tiempoGol });}
      input.remove();}});                                                      // Oculta el input después de enviar
  botones.insertBefore(input, botones.firstChild);                             // Inserta el input antes de los botones
  input.focus();};

document.getElementById("golA-menos").onclick = () => {
  if (golesA > 0) {
    golesA--;
    actualizarResultado();
    socket.emit('goles', { equipo: 'A', goles: golesA });
    socket.emit('eliminarUltimoGoleador', { equipo: 'A' });}};

document.getElementById("golB-mas").onclick = () => {
  const botones = document.getElementById("botonesB");
  if (document.getElementById("inputGoleadorB")) return;                       // Evita que se añadan varios inputs si ya hay uno
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Nombre del goleador";
  input.id = "inputGoleadorB";
  input.className = "input-goleador";
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const nombre = input.value.trim();
      golesB++;
      actualizarResultado();
      socket.emit("goles", { equipo: "B", goles: golesB });
      if (nombre !== "") {
        const tiempoGol = 600 - tiempoPartido;
        socket.emit("goleador", { equipo: "B", nombre, tiempo: tiempoGol });}
      input.remove();}});                                                      // Oculta el input después de enviar
  botones.insertBefore(input, botones.firstChild);                             // Inserta el input antes de los botones
  input.focus();};

document.getElementById("golB-menos").onclick = () => {
  if (golesB > 0) {
    golesB--;
    actualizarResultado();
    socket.emit('goles', { equipo: 'B', goles: golesB });
    socket.emit('eliminarUltimoGoleador', { equipo: 'B' });}};

// Start partido
document.getElementById("startPartido").onclick = () => {
  if (!intervaloPartido) {
    intervaloPartido = setInterval(() => {
      if (tiempoPartido > 0) {
        tiempoPartido--;
        actualizarCronoPartido();
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });
      } else {
        clearInterval(intervaloPartido); intervaloPartido = null;}}, 1000);}
  if (!intervaloPosesion) {
    iniciarCuentaAtrasPosesion();}
  reanudarTodasLasTarjetas();
  socket.emit("reanudarTiempo");};

// Stop partido
document.getElementById("stopPartido").onclick = () => {
  if (intervaloPartido) {                                        // Detener cronómetro del partido
    clearInterval(intervaloPartido); intervaloPartido = null;}
  if (intervaloPosesion) {                                       // Detener cronómetro de posesión
    clearInterval(intervaloPosesion); intervaloPosesion = null;}
  pausarTodasLasTarjetas();                                      // Pausar todos los cronómetros de tarjetas
  socket.emit("pararTiempo");};

// Reset partido
document.getElementById("resetPartido").onclick = () => {
  clearInterval(intervaloPartido); intervaloPartido = null; tiempoPartido = 600;
  actualizarCronoPartido(); socket.emit('cronometroPartido', { tiempo: tiempoPartido });};

// Edit partido
document.getElementById("editPartido").onclick = () => {
  const contenedor = document.getElementById("tiempoPartido");           // Selección contenedor a editar
  const input = document.createElement("input");                         // Crear campo de edición
  input.type = "text";
  input.value = contenedor.textContent;                                  // Tiempo actual como valor inicial
  input.className = "input-edicion";
  input.placeholder = "MM:SS";
  const confirmarCambio = () => {                                        // Confirmar cambio
    const partes = input.value.split(":");                               // Dividir el valor
    if (partes.length === 2) {                                           // Dos partes (minutos y segundos)
      const minutos = parseInt(partes[0], 10);
      const segundos = parseInt(partes[1], 10);
      if (!isNaN(minutos) && !isNaN(segundos) &&                         // Validar tiempo en rango
        minutos >= 0 && segundos >= 0 && segundos < 60) {
          const totalSegundos = minutos * 60 + segundos;                 // Convertir tiempo en segundos
          if (totalSegundos <= 600) {
            tiempoPartido = totalSegundos;}            
        actualizarCronoPartido();                                        // Actualizar visualmente
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });}}};
  input.addEventListener("keydown", (e) => {                             // Evento confirma cambio al presionar enter
    if (e.key === "Enter") {
      confirmarCambio();}});
  input.addEventListener("blur", confirmarCambio);                       // Evento confirma cambio al perder foco (opcional)
  contenedor.textContent = "";                                           // Limpiar contenedor y reemplazar
  contenedor.appendChild(input);                                         // Agregar campo de entrada
  input.focus();};                                                       // Colocar foco en campo de entrada para escribir

// Tiempo de juego y opciones de la barra central
document.getElementById("part").addEventListener("change", function () {
  const tiempo = this.value;
  socket.emit("tiempoJuego", { tiempo });});

// Start posesión
document.getElementById("startPosesion").onclick = () => {
  if (!intervaloPosesion) {
    iniciarCuentaAtrasPosesion();}};

// Stop posesión
document.getElementById("stopPosesion").onclick = () => {
  clearInterval(intervaloPosesion); intervaloPosesion = null;};

// Reset posesión (siempre inicia la cuenta atrás)
document.getElementById("resetPosesion").onclick = () => {
  tiempoPosesion = 60;
  actualizarPosesion();
  socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
  iniciarCuentaAtrasPosesion();};

// Edit posesión
document.getElementById("editPosesion").onclick = () => {
  const contenedor = document.getElementById("tiempoPosesion"); 
  const input = document.createElement("input");                
  input.type = "text";
  input.value = tiempoPosesion;
  input.className = "input-edicion";
  const confirmarCambio = () => {
    let nuevoValor = parseInt(input.value);
    if (!isNaN(nuevoValor) && nuevoValor >= 0 && nuevoValor <= 60) {
      tiempoPosesion = nuevoValor;}
    actualizarPosesion(); socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });};
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarCambio();});
  input.addEventListener("blur", confirmarCambio);
  contenedor.textContent = "";
  contenedor.appendChild(input);
  input.focus();};

// Control botones tarjetas
["A", "B"].forEach(equipo => {
  ["roja", "amarilla", "verde"].forEach(tipo => {
    document.getElementById(`${tipo}${equipo}-mas`).onclick = () => manejarTarjeta(equipo, tipo, "mas");
    document.getElementById(`${tipo}${equipo}-menos`).onclick = () => manejarTarjeta(equipo, tipo, "menos");});});

// Control reinicio marcador
document.getElementById("part").addEventListener("change", function () {
  const valor = this.value;
  if (valor === "reiniciar") {
    if (confirm("¿Estás seguro de que deseas reiniciar el marcador?")) {
      socket.emit("reiniciarMarcador");
      location.reload();}                                                 // Recarga el panel de control
    this.value = "1";                                                     // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });}});

// Control para finalizar partido
document.getElementById("part").addEventListener("change", function () {
  const valor = this.value;
  if (valor === "finalizar") {
  if (confirm("¿Quieres finalizar el partido y guardar los datos?")) {
    socket.emit("finalizarPartido");
    alert("✅ Partido guardado correctamente");
    location.reload();}
    this.value = "1";                                                      // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });}});

// FUNCIONES
function manejarNombreEquipo(inputElement, equipo) {                        // Manejar el envío de nombres de los equipos
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const nombreEquipo = inputElement.value.trim();
      if (nombreEquipo) {                                                   // Verifica que el nombre no esté vacío antes de enviarlo
        socket.emit('nombreEquipo', { equipo, nombre: nombreEquipo });      // Envía el nombre al servidor
        console.log(`Nombre de ${equipo} enviado: ${nombreEquipo}`);     
        inputElement.value = nombreEquipo;}}});}                            // No limpiamos el campo de entrada, por lo que el nombre se queda en el input

function actualizarResultado() {                                            // Actualización resultado
  document.getElementById("resultadoA").textContent = golesA;
  document.getElementById("resultadoB").textContent = golesB; }

function actualizarCronoPartido() {                                         // Actualización del tiempo de partido
  let minutos = Math.floor(tiempoPartido / 60);
  let segundos = tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent =
    `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`; }

function iniciarCuentaAtrasPosesion() {
  clearInterval(intervaloPosesion);                                        // Por si acaso ya estaba corriendo
  intervaloPosesion = setInterval(() => {
    if (tiempoPosesion > 0) {
      tiempoPosesion--;
      actualizarPosesion();
      socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
    } else {
      clearInterval(intervaloPosesion); intervaloPosesion = null;}}, 1000);}

function actualizarPosesion() {                                         // Actualizar posesión
  const el = document.getElementById("tiempoPosesion");
  el.textContent = tiempoPosesion;}
  
function manejarTarjeta(equipo, tipo, operacion) {                       // Añadir o quitar tarjetas
  const lista = tarjetas[equipo][tipo];                                  // Lista tarjetas actual
  const extra = document.getElementById(`expulsionesExtra${equipo}`);    // Contenedor visual expulsiones
  const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`); // Contador visual

  if (operacion === "mas") {                                             // Añadir tarjetas
    const tarjeta = document.createElement("div");                       // Crea elemento visual de tarjeta
    tarjeta.className = `tarjeta-nombre ${tipo}`;
    const input = document.createElement("input");                       // Campo para añadir nombre de jugador
    input.addEventListener("keydown", (e) => {                           // Poner tarjeta al presionar enter
      if (e.key === "Enter" && input.value.trim() !== "") {
        const nombre = document.createElement("span");
        nombre.textContent = input.value;
        input.replaceWith(nombre);
        const tiempo = document.createElement("span");
        tarjeta.appendChild(tiempo);
        iniciarCuentaAtras(tiempo, tarjeta);
        socket.emit('tarjeta', { equipo, tipo, operacion: "mas", nombre: nombre.textContent, conteo: contadorTarjetas });}});

    tarjeta.addEventListener("click", () => {
      if (confirm("¿Deseas eliminar esta tarjeta?")) {
        const index = lista.indexOf(tarjeta);
        if (index !== -1) {
          lista.splice(index, 1);                                       // Eliminar de la lista
          tarjeta.remove();                                             // Eliminar visualmente
          socket.emit('tarjeta', { equipo, tipo, operacion: "menos", conteo: contadorTarjetas });}}});

    tarjeta.appendChild(input);
    if (tipo === "roja") {extra.prepend(tarjeta);
      } else if (tipo === "verde") {extra.appendChild(tarjeta);
      } else {
        const rojas = extra.querySelectorAll(".tarjeta-nombre.roja").length;
        const children = Array.from(extra.children);
        extra.insertBefore(tarjeta, children[rojas] || null);}
    lista.push(tarjeta);                                                 // Añadir a lista interna
    contadorTarjetas[equipo][tipo]++;
    cantidad.textContent = contadorTarjetas[equipo][tipo];               // Mostrar el conteo
    input.focus();}                                                      // Foco en el campo del texto

  if (operacion === "menos" && lista.length > 0) {                       // Restar tarjetas                   
    const tarjeta = lista.pop();
    if (tarjeta) tarjeta.remove();
    contadorTarjetas[equipo][tipo]--;
    cantidad.textContent = contadorTarjetas[equipo][tipo];
    socket.emit('tarjeta', { equipo, tipo, operacion: "menos", conteo: contadorTarjetas });}}

function iniciarCuentaAtras(span, contenedor) {
  let tiempo = 120;
  function actualizar() {
    const min = String(Math.floor(tiempo / 60)).padStart(2, "0");
    const seg = String(tiempo % 60).padStart(2, "0");
    span.textContent = `${min}:${seg}`;}
  actualizar();
  const tarjetaData = { tiempo, span, contenedor, intervalo: null };
  function tick() {
    tarjetaData.tiempo--;
    if (tarjetaData.tiempo <= 0) {
      clearInterval(tarjetaData.intervalo);
      contenedor.remove();
    } else {
      const min = String(Math.floor(tarjetaData.tiempo / 60)).padStart(2, "0");
      const seg = String(tarjetaData.tiempo % 60).padStart(2, "0");
      tarjetaData.span.textContent = `${min}:${seg}`;}}
  tarjetaData.intervalo = setInterval(tick, 1000);
  tarjetasActivas.push(tarjetaData);}

function pausarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => clearInterval(t.intervalo));}

function reanudarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => {
    t.intervalo = setInterval(() => {
      t.tiempo--;
      if (t.tiempo <= 0) {
        clearInterval(t.intervalo); t.contenedor.remove();
      } else {
        const min = String(Math.floor(t.tiempo / 60)).padStart(2, "0");
        const seg = String(t.tiempo % 60).padStart(2, "0");
        t.span.textContent = `${min}:${seg}`;}}, 1000);});}

// ESCUCHAR EVENTOS EMITIDOS POR EL SERVIDOR
socket.on('goles', (data) => {
  if (data.equipo === 'A') golesA = data.goles;
  if (data.equipo === 'B') golesB = data.goles;
  actualizarResultado();});
socket.emit("goleador", { equipo, nombre });
socket.on('cronometroPartido', (data) => {
  tiempoPartido = data.tiempo;
  let min = Math.floor(tiempoPartido / 60);
  let seg = tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  actualizarCronoPartido();});
socket.on('cronometroPosesion', (data) => {
  tiempoPosesion = data.tiempo;
  actualizarPosesion();});
socket.on('tarjeta', (data) => {
  manejarTarjeta(data.equipo, data.tipo, data.operacion);
  actualizar();});