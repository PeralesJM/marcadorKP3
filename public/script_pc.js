// VARIABLES                                                                  // Apartado donde se guardan todas las variables iniciales
let golesA = 0, golesB = 0;                                                   // Resultado equipos A y B. Inician en 0
let tiempoPartido = 600; let intervaloPartido = null;                         // Cronómetro del partido: Inicia en 600 segundos; Intervalo: Decrementa cada segundo
let tiempoPosesion = 60; let intervaloPosesion = null;                        // Cronómetro de posesión: Inicia en 60 segundos; Intervalo
const socket = io();                                                          // Conexión al servidor socket.io para enviar y recibir eventos entre archivos
const tarjetas = {                                                            // Tarjetas. Guarda un array por cada tipo de tarjet y equipo
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }};
const tarjetasActivas = [];                                                   // Guarda array por tarjeta activa (con cuenta atrás en uso)
const contadorTarjetas = {                                                    // Conteo de tarjetas totales (Solo para el árbitro). Inician en 0
  A: { roja: 0, amarilla: 0, verde: 0 },
  B: { roja: 0, amarilla: 0, verde: 0 },};

// CONTROLES                                                                  // Apartado que engloba los botones para el manejo del panel de control
// Selección de inputs + Llamada a función para manejar nombres de equipos
const equipoAInput = document.getElementById('equipoA'); manejarNombreEquipo(equipoAInput, 'A');
const equipoBInput = document.getElementById('equipoB'); manejarNombreEquipo(equipoBInput, 'B');

// Goles y goleadores
document.getElementById("golA-mas").onclick = () => {                         // Añadir gol equipo A: Se ejecuta con el botón "+"
  const botones = document.getElementById("botonesA");
  if (document.getElementById("inputGoleadorA")) return;                      // Verifica si hay un input para ingresar un goleador y evitar duplicados
  const input = document.createElement("input");                              // Crea un input de texto para escribir el nombre del goleador
  input.type = "text";
  input.placeholder = "Nombre del goleador";                                  // Texto previo a sobrescribir para indicar que se ha de poner
  input.id = "inputGoleadorA";                                                // id donde se agrega el texto
  input.className = "input-goleador";
  input.addEventListener("keydown", (event) => {                              // Evento que activa el control (Enter)
    if (event.key === "Enter") {
      const nombre = input.value.trim();
      golesA++;                                                               // Incremento de resultado en +1
      actualizarResultado();                                                  // Llamada a función actualizarResultado
      socket.emit("goles", { equipo: "A", goles: golesA });                   // Se emite evento "goles" por Socket.IO con el resultado actualizado
      if (nombre !== "") {                                                    // Verifica que se ingrese un nombre de goleador no vacío
        const tiempoGol = 600 - tiempoPartido;                                // Calcula el tiempo en que se ha metido el gol, restando el actual al total
        socket.emit("goleador", { equipo: "A", nombre, tiempo: tiempoGol });} // Emite un evento "goleador" con el nombre y el minuto
      input.remove();}});                                                     // Oculta el input del goleador después de enviar
  botones.insertBefore(input, botones.firstChild);                            // Inserta el input justo encima de los botones "+" y "-"
  input.focus();};                                                            // Se pone el foco en el input cuando sale para que el usuario pueda escribirlo directamente

document.getElementById("golA-menos").onclick = () => {                       // Restar gol equipo A: Se ejecuto con el botón "-"
  if (golesA > 0) {                                                           // Verifica que el resultado sea mayor que 0 para evitar resultados negativos
    golesA--;                                                                 // Resta 1 al resultado
    actualizarResultado();
    socket.emit('goles', { equipo: 'A', goles: golesA });
    socket.emit('eliminarUltimoGoleador', { equipo: 'A' });}};                // Emite un evento para eliminar el último goleador registrado 

document.getElementById("golB-mas").onclick = () => {                         // Añadir gol equipo B. Misma logica
  const botones = document.getElementById("botonesB");
  if (document.getElementById("inputGoleadorB")) return;
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
      input.remove();}});
  botones.insertBefore(input, botones.firstChild);
  input.focus();};

document.getElementById("golB-menos").onclick = () => {                      // Restar gol equipo B. Misma lógica
  if (golesB > 0) {
    golesB--;
    actualizarResultado();
    socket.emit('goles', { equipo: 'B', goles: golesB });
    socket.emit('eliminarUltimoGoleador', { equipo: 'B' });}};

// Start partido
document.getElementById("startPartido").onclick = () => {                    // Control para manejar el inicio y reanudación del partido al pulsar en el botón con id="startPartido"
  if (!intervaloPartido) {                                                   // Verifica que no haya intervalo para que este no se duplique
    intervaloPartido = setInterval(() => {                                   // Inicia el intervalo cada segundo con las siguientes instrucciones
      if (tiempoPartido > 0) {                                               // Verifica que el tiempo sea mayor a 0 para que no se vaya a tiempo negativo
        tiempoPartido--;                                                     // Resta un segundo
        actualizarCronoPartido();                                            // Llama a la función "ActualizarCronoPartido"
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });         // Emite el evento con el tiempo restante
      } else {
        clearInterval(intervaloPartido); intervaloPartido = null;}}, 1000);} // Si el tiempo llega a 0 se detiene el cronómetro
  if (!intervaloPosesion) {                                                  // Verifica si el intervalo del cronómetro de posesión está activo para evitar que se duplique
    iniciarCuentaAtrasPosesion();}                                           // Llama a la función "iniciarCuentaAtrasPosesion" para iniciarla también
  reanudarTodasLasTarjetas();                                                // Llama a la función "reanudarTodasLasTarjetas" para iniciarlas también
  socket.emit("reanudarTiempo");};                                           // Emite el evento "reanudarTiempo" por socket

// Stop partido
document.getElementById("stopPartido").onclick = () => {                     // Control para manejar la parada del tiempo de partido al pulsar en el botón con id="stopPartido"
  if (intervaloPartido) {                                                    // Verifica que el intervalo del partido esté activo
    clearInterval(intervaloPartido); intervaloPartido = null;}               // Limpia el intervalo en este caso y lo devuelve a nulo
  if (intervaloPosesion) {                                                   // También verifica el intervalo de posesión
    clearInterval(intervaloPosesion); intervaloPosesion = null;}             // Limpia el intervalo de posesión y lo devuelve a nulo
  pausarTodasLasTarjetas();                                                  // Pausar todos los cronómetros de tarjetas
  socket.emit("pararTiempo");};                                              // Emite evento "pararTiempo" por socket

// Reset partido
document.getElementById("resetPartido").onclick = () => {                                  // Control para resetear el tiempo de partido al pulsar el botón con id="resetPartido"
  clearInterval(intervaloPartido); intervaloPartido = null; tiempoPartido = 600;           // Limpia el intervalo, lo devuelve a nulo y lo regresa al tiempo inicial de 600 segundos
  actualizarCronoPartido(); socket.emit('cronometroPartido', { tiempo: tiempoPartido });}; // Actualiza y emite el tiempo por socket

// Edit partido
document.getElementById("editPartido").onclick = () => {                     // Control para editar el tiempo de partido al pulsar el botón con id="editPartido"
  const contenedor = document.getElementById("tiempoPartido");               // Selección contenedor a editar
  const input = document.createElement("input");                             // Crear campo de edición
  input.type = "text";                                                       // Campo tipo texto
  input.value = contenedor.textContent;                                      // Tiempo actual como valor inicial
  input.className = "input-edicion";                                         // Aplica una clase "input-edition"
  input.placeholder = "MM:SS";                                               // Aplica un texto previo en formato MM:SS
  const confirmarCambio = () => {                                            // Función interna para confirmar cambio
    const partes = input.value.split(":");                                   // Divide el valor en el formato MM:SS
    if (partes.length === 2) {
      const minutos = parseInt(partes[0], 10);
      const segundos = parseInt(partes[1], 10);
      if (!isNaN(minutos) && !isNaN(segundos) &&                             // Validar tiempo en rango
        minutos >= 0 && segundos >= 0 && segundos < 60) {
          const totalSegundos = minutos * 60 + segundos;                     // Convertir tiempo en segundos
          if (totalSegundos <= 600) {                                        // Verifica que el tiempo total no exceda de 600 segundos
            tiempoPartido = totalSegundos;}            
        actualizarCronoPartido();
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });}}};     // Emite por socket
  input.addEventListener("keydown", (e) => {                                 // Evento se confirma
    if (e.key === "Enter") {                                                 // Al presionar "Enter"
      confirmarCambio();}});
  input.addEventListener("blur", confirmarCambio);                           // Evento confirma cambio al perder foco
  contenedor.textContent = "";                                               // Limpiar contenedor y reemplazar
  contenedor.appendChild(input);                                             // Agregar campo de entrada
  input.focus();};                                                           // Colocar foco en campo de entrada para escribir

// Tiempo de juego y opciones de la barra central
document.getElementById("part").addEventListener("change", function () {     // Control para manejar el selector central (Primer tiempo, Segundo tiempo, etc)
  const tiempo = this.value;
  socket.emit("tiempoJuego", { tiempo });});

// Start posesión
document.getElementById("startPosesion").onclick = () => {                   // Control para manejar el inicio y reanudación del cronómetro de posesión
  if (!intervaloPosesion) {
    iniciarCuentaAtrasPosesion();}};

// Stop posesión
document.getElementById("stopPosesion").onclick = () => {                    // Control para manejar la parada del cronómetro de posesión
  clearInterval(intervaloPosesion); intervaloPosesion = null;};

// Reset posesión (siempre inicia la cuenta atrás)
document.getElementById("resetPosesion").onclick = () => {                   // Control para manejar el reseteo del cronómetro de posesión
  tiempoPosesion = 60;                                                       // Se resetea en 60 segundos
  actualizarPosesion();
  socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
  iniciarCuentaAtrasPosesion();};

// Edit posesión
document.getElementById("editPosesion").onclick = () => {                    // Control para manejar la edición del cronómetro de posesión. Similar al de tiempo de partido
  const contenedor = document.getElementById("tiempoPosesion");
  const input = document.createElement("input");                             // Se reemplaza el tiempo por un input de texto editable
  input.type = "text";
  input.value = tiempoPosesion;
  input.className = "input-edicion";
  const confirmarCambio = () => {
    let nuevoValor = parseInt(input.value);
    if (!isNaN(nuevoValor) && nuevoValor >= 0 && nuevoValor <= 60) {         // Verifica si el valor es válido (Entre 0 y 60 segundos)
      tiempoPosesion = nuevoValor;}
    actualizarPosesion(); socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });};
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarCambio();});
  input.addEventListener("blur", confirmarCambio);
  contenedor.textContent = "";
  contenedor.appendChild(input);
  input.focus();};

// Control botones tarjetas
["A", "B"].forEach(equipo => {                                                                                     // Controles para manejar las tarjetas, en función del equipo
  ["roja", "amarilla", "verde"].forEach(tipo => {                                                                  // En función del tipo de tarjeta
    document.getElementById(`${tipo}${equipo}-mas`).onclick = () => manejarTarjeta(equipo, tipo, "mas");           // Botón para añadir tarjeta y función
    document.getElementById(`${tipo}${equipo}-menos`).onclick = () => manejarTarjeta(equipo, tipo, "menos");});}); // Botón para restar tarjeta y función

// Control reinicio marcador
document.getElementById("part").addEventListener("change", function () {
  const valor = this.value;
  if (valor === "reiniciar") {                                            // Selección de la opción "reiniciar"
    if (confirm("¿Estás seguro de que deseas reiniciar el marcador?")) {  // Pregunta de confirmación
      socket.emit("reiniciarMarcador");                                   // Emite evento al socket
      location.reload();}                                                 // Recarga el panel de control
    this.value = "1";                                                     // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });}});

// Control para finalizar partido
document.getElementById("part").addEventListener("change", function () {
  const valor = this.value;
  if (valor === "finalizar") {                                            // Selección de la opción "finalizar"
  if (confirm("¿Quieres finalizar el partido y guardar los datos?")) {    // Pregunta de confirmación
    socket.emit("finalizarPartido");
    alert("✅ Partido guardado correctamente");                           // Mensaje de alerta de partido guardado
    location.reload();}
    this.value = "1";                                                     // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });}});

// FUNCIONES
function manejarNombreEquipo(inputElement, equipo) {                        // Manejar el envío de nombres de los equipos
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const nombreEquipo = inputElement.value.trim();
      if (nombreEquipo) {                                                   // Verifica que el nombre no esté vacío antes de enviarlo
        socket.emit('nombreEquipo', { equipo, nombre: nombreEquipo });      // Envía el nombre al servidor
        console.log(`Nombre de ${equipo} enviado: ${nombreEquipo}`);        // Muestra mensaje con el nombre de equipo enviado
        inputElement.value = nombreEquipo;}}});}                            // No limpiamos el campo de entrada, por lo que el nombre se queda en el input

function actualizarResultado() {                                            // Actualización resultado
  document.getElementById("resultadoA").textContent = golesA;               // Muestra goles de equipo A
  document.getElementById("resultadoB").textContent = golesB;}              // Muestra goles de equipo B

function actualizarCronoPartido() {                                                     // Actualización del tiempo de partido
  let minutos = Math.floor(tiempoPartido / 60);                                         // Convierte los segundos en minutos
  let segundos = tiempoPartido % 60;                                                    // Obtiene los segundos restantes
  document.getElementById("tiempoPartido").textContent =                                // Actualiza el contenido del cronómetro en pantalla
    `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`; } // Permite formato MM:SS

function iniciarCuentaAtrasPosesion() {                                      // Iniciar cuenta atrás del cronómetro de posesión
  clearInterval(intervaloPosesion);                                          // Limpia intervalo anterior 
  intervaloPosesion = setInterval(() => {                                    // Crea el nuevo intervalo
    if (tiempoPosesion > 0) {                                                // Verifica que el tiempo es mayor a 0 para evitar números negativos
      tiempoPosesion--;                                                      // Resta un segundo cada segundo
      actualizarPosesion();                                                  // Va actualizando en pantalla
      socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });         // Envía nuevo tiempo al servidor
    } else {
      clearInterval(intervaloPosesion); intervaloPosesion = null;}}, 1000);} // Se detiene el cronómetro cuando llega a 0

function actualizarPosesion() {                                              // Actualizar posesión
  const el = document.getElementById("tiempoPosesion");
  el.textContent = tiempoPosesion;}
  
function manejarTarjeta(equipo, tipo, operacion) {                       // Añadir o quitar tarjetas
  const lista = tarjetas[equipo][tipo];                                  // Lista tarjetas actual
  const extra = document.getElementById(`expulsionesExtra${equipo}`);    // Contenedor visual expulsiones
  const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`); // Contador visual

  if (operacion === "mas") {                                             // Añadir tarjetas
    const tarjeta = document.createElement("div");                       // Crea elemento visual de tarjeta
    tarjeta.className = `tarjeta-nombre ${tipo}`;                        // Clase según tipo de tarjeta
    const input = document.createElement("input");                       // Campo para añadir nombre de jugador
    input.addEventListener("keydown", (e) => {                           // Poner tarjeta al presionar enter
      if (e.key === "Enter" && input.value.trim() !== "") {              // Verifica el enter
        const nombre = document.createElement("span");                   // Crea un span con el nombre
        nombre.textContent = input.value;
        input.replaceWith(nombre);                                       // Reemplaza el input por el span con nombre
        const tiempo = document.createElement("span");                   // Crea un span con el cronómetro
        tarjeta.appendChild(tiempo);                                     // Agrega el span a la trajeta
        iniciarCuentaAtras(tiempo, tarjeta);                             // Inicia la cuenta atrás
        socket.emit('tarjeta', { equipo, tipo, operacion: "mas", nombre: nombre.textContent, conteo: contadorTarjetas });}}); // Envía el evento

    tarjeta.addEventListener("click", () => {                            // Permite eliminar la tarjeta pinchando en ella
      if (confirm("¿Deseas eliminar esta tarjeta?")) {                   // Pregunta de confirmación
        const index = lista.indexOf(tarjeta);
        if (index !== -1) {
          lista.splice(index, 1);                                        // Elimina la tarjeta de la lista
          tarjeta.remove();                                              // Eliminar visualmente la tarjeta
          socket.emit('tarjeta', { equipo, tipo, operacion: "menos", conteo: contadorTarjetas });}}}); // Envía el evento

    tarjeta.appendChild(input);                                              // Ordenar tarjetas por tipo
    if (tipo === "roja") {extra.prepend(tarjeta);                            // Verifica si es roja y la pone la primera
      } else if (tipo === "verde") {extra.appendChild(tarjeta);              // Verifica si es verde y la pone la última
      } else {
        const rojas = extra.querySelectorAll(".tarjeta-nombre.roja").length; 
        const children = Array.from(extra.children);
        extra.insertBefore(tarjeta, children[rojas] || null);}               // Coloca el resto en medio (Amarillas)
    lista.push(tarjeta);                                                     // Añadir a lista interna
    contadorTarjetas[equipo][tipo]++;                                        // Aumenta en uno el contador
    cantidad.textContent = contadorTarjetas[equipo][tipo];                   // Mostrar el conteo
    input.focus();}                                                          // Foco en el campo del texto

  if (operacion === "menos" && lista.length > 0) {                           // Restar tarjetas                   
    const tarjeta = lista.pop();
    if (tarjeta) tarjeta.remove();
    contadorTarjetas[equipo][tipo]--;
    cantidad.textContent = contadorTarjetas[equipo][tipo];
    socket.emit('tarjeta', { equipo, tipo, operacion: "menos", conteo: contadorTarjetas });}}

function iniciarCuentaAtras(span, contenedor) {                              // Iniciar cuenta atrás para tarjetas
  let tiempo = 120;                                                          // Tiempo inicial de 120 segundos
  function actualizar() {
    const min = String(Math.floor(tiempo / 60)).padStart(2, "0");            // Pasa segundos a minutos
    const seg = String(tiempo % 60).padStart(2, "0");                        // Añade los segundos restantes
    span.textContent = `${min}:${seg}`;}                                     // Permite formato MM:SS
  actualizar();                                                              // Muestra el tiempo actual
  const tarjetaData = { tiempo, span, contenedor, intervalo: null };         // Datos de la tarjeta activa
  function tick() {                                                          // Función interna para la cuenta atrás
    tarjetaData.tiempo--;                                                    // Resta un segundo cada segundo
    if (tarjetaData.tiempo <= 0) {                                           // Verifica que el tiempo es mayor que 0
      clearInterval(tarjetaData.intervalo);                                  // Se detiene al acabar el intervalo
      contenedor.remove();                                                   // Se elimina
    } else {
      const min = String(Math.floor(tarjetaData.tiempo / 60)).padStart(2, "0");
      const seg = String(tarjetaData.tiempo % 60).padStart(2, "0");
      tarjetaData.span.textContent = `${min}:${seg}`;}}
  tarjetaData.intervalo = setInterval(tick, 1000);
  tarjetasActivas.push(tarjetaData);}

function pausarTodasLasTarjetas() {                                          // Función que detiene todos los intervalos de las tarjetas
  tarjetasActivas.forEach(t => clearInterval(t.intervalo));}

function reanudarTodasLasTarjetas() {                                        // Reanudar todas las tarjetas con cronómetro
  tarjetasActivas.forEach(t => {                                             // Selecciona las tarjetas activas (Con cronómetro)
    t.intervalo = setInterval(() => {                                        // Reinicia cada cronómetro. El resto es igual que la función de iniciar cuenta atrás
      t.tiempo--;
      if (t.tiempo <= 0) {
        clearInterval(t.intervalo); t.contenedor.remove();
      } else {
        const min = String(Math.floor(t.tiempo / 60)).padStart(2, "0");
        const seg = String(t.tiempo % 60).padStart(2, "0");
        t.span.textContent = `${min}:${seg}`;}}, 1000);});}


// ESCUCHAR EVENTOS EMITIDOS POR EL SERVIDOR
socket.on('goles', (data) => {                             // Escucha actualizaciones de goles
  if (data.equipo === 'A') golesA = data.goles;
  if (data.equipo === 'B') golesB = data.goles;
  actualizarResultado();});
socket.on('cronometroPartido', (data) => {                 // Escucha el cronómetro de partido
  tiempoPartido = data.tiempo;
  let min = Math.floor(tiempoPartido / 60);
  let seg = tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  actualizarCronoPartido();});
socket.on('cronometroPosesion', (data) => {                // Escucha el cronómetro de posesión
  tiempoPosesion = data.tiempo;
  actualizarPosesion();});
socket.on('tarjeta', (data) => {                           // Escucha las tarjetas
  manejarTarjeta(data.equipo, data.tipo, data.operacion);
  actualizar();});