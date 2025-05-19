// CONEXION AL SERVIDOR SOCKET.IO
const socket = io();

// NOMBRES EQUIPO
function manejarNombreEquipo(inputElement, equipo) {                        // Función general para manejar el envío de nombres de los equipos
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const nombreEquipo = inputElement.value.trim();
      
      if (nombreEquipo) {                                                   // Verifica que el nombre no esté vacío antes de enviarlo
        socket.emit('nombreEquipo', { equipo, nombre: nombreEquipo });      // Envía el nombre al servidor
        console.log(`Nombre de ${equipo} enviado: ${nombreEquipo}`);     
        inputElement.value = nombreEquipo;                                  // No limpiamos el campo de entrada, por lo que el nombre se queda en el input
      } else {
        alert(`Por favor ingresa un nombre para el equipo ${equipo}.`);
      }
    }
  });
}

// Selecciona los inputs de equipo A y equipo B
const equipoAInput = document.getElementById('equipoA');
const equipoBInput = document.getElementById('equipoB');
// Llama a la función para manejar ambos equipos
manejarNombreEquipo(equipoAInput, 'A');
manejarNombreEquipo(equipoBInput, 'B');

// RESULTADO
let golesA = 0, golesB = 0;
// Control botones
document.getElementById("golA-mas").onclick = () => { golesA++; actualizarResultado(); socket.emit('goles', { equipo: 'A', goles: golesA });};
document.getElementById("golA-menos").onclick = () => { if (golesA > 0) golesA--; actualizarResultado(); socket.emit('goles', { equipo: 'A', goles: golesA });};
document.getElementById("golB-mas").onclick = () => { golesB++; actualizarResultado(); socket.emit('goles', { equipo: 'B', goles: golesB });};
document.getElementById("golB-menos").onclick = () => { if (golesB > 0) golesB--; actualizarResultado(); socket.emit('goles', { equipo: 'B', goles: golesB });};
// Actualización resultado
function actualizarResultado() {
  document.getElementById("resultadoA").textContent = golesA;
  document.getElementById("resultadoB").textContent = golesB; }

// CRONÓMETRO DE PARTIDO
let tiempoPartido = 600; 
let intervaloPartido = null; // Guarda id del intervalo para detener tiempo
// Start partido
document.getElementById("startPartido").onclick = () => {
  if (!intervaloPartido) {
    intervaloPartido = setInterval(() => {
      if (tiempoPartido > 0) {
        tiempoPartido--;
        actualizarCronoPartido();
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });
      } else {
        clearInterval(intervaloPartido);
        intervaloPartido = null;
      }
    }, 1000);
  }
};

// Stop partido
document.getElementById("stopPartido").onclick = () => {
  clearInterval(intervaloPartido);
  intervaloPartido = null; };
// Reset partido
document.getElementById("resetPartido").onclick = () => {
  clearInterval(intervaloPartido);
  intervaloPartido = null;
  tiempoPartido = 600;
  actualizarCronoPartido(); socket.emit('cronometroPartido', { tiempo: tiempoPartido });};
// Edit partido
document.getElementById("editPartido").onclick = () => {
  const contenedor = document.getElementById("tiempoPartido"); // Selección contenedor a editar
  const input = document.createElement("input");               // Crear campo de edición
  input.type = "text";
  input.value = contenedor.textContent;                        // Tiempo actual como valor inicial
  input.className = "input-edicion";
  input.placeholder = "MM:SS";
  // Confirmar cambio
  const confirmarCambio = () => {
    const partes = input.value.split(":");                 // Dividir el valor
    if (partes.length === 2) {                             // Dos partes (minutos y segundos)
      const minutos = parseInt(partes[0], 10);
      const segundos = parseInt(partes[1], 10);
      if (!isNaN(minutos) && !isNaN(segundos) &&           // Validar tiempo en rango
        minutos >= 0 && segundos >= 0 && segundos < 60) {
          const totalSegundos = minutos * 60 + segundos;   // Convertir tiempo en segundos
          if (totalSegundos <= 600) {
            tiempoPartido = totalSegundos;}            
        actualizarCronoPartido();                          // Actualizar visualmente
        socket.emit('cronometroPartido', { tiempo: tiempoPartido });
      }
    }
  };
  input.addEventListener("keydown", (e) => {               // Evento confirma cambio al presionar enter
    if (e.key === "Enter") {
      confirmarCambio();
    }
  });
  input.addEventListener("blur", confirmarCambio);         // Evento confirma cambio al perder foco (opcional)
  // Reemplazar
  contenedor.textContent = "";                             // Limpiar contenedor
  contenedor.appendChild(input);                           // Agregar campo de entrada
  input.focus();                                           // Colocar foco en campo de entrada para escribir
};                                         
// Actualización del tiempo de partido
function actualizarCronoPartido() {
  let minutos = Math.floor(tiempoPartido / 60);
  let segundos = tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent =
    `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`; }

// TIEMPO DE JUEGO
document.getElementById("part").addEventListener("change", function () {
  const tiempo = this.value;
  socket.emit("tiempoJuego", { tiempo });
});

// CRONÓMETRO DE POSESIÓN
let tiempoPosesion = 60;
let intervaloPosesion = null;

function iniciarCuentaAtrasPosesion() {
  clearInterval(intervaloPosesion); // Por si acaso ya estaba corriendo
  intervaloPosesion = setInterval(() => {
    if (tiempoPosesion > 0) {
      tiempoPosesion--;
      actualizarPosesion();
      socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
    } else {
      clearInterval(intervaloPosesion);
      intervaloPosesion = null;
    }
  }, 1000);
}
// Start posesión
document.getElementById("startPosesion").onclick = () => {
  if (!intervaloPosesion) {
    iniciarCuentaAtrasPosesion();
  }
};
// Stop posesión
document.getElementById("stopPosesion").onclick = () => {
  clearInterval(intervaloPosesion);
  intervaloPosesion = null;
};
// Reset posesión (siempre inicia la cuenta atrás)
document.getElementById("resetPosesion").onclick = () => {
  tiempoPosesion = 60;
  actualizarPosesion();
  socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
  iniciarCuentaAtrasPosesion();
};
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
      tiempoPosesion = nuevoValor;
    }
    actualizarPosesion(); socket.emit('cronometroPosesion', { tiempo: tiempoPosesion });
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarCambio();});
  input.addEventListener("blur", confirmarCambio);
  contenedor.textContent = "";
  contenedor.appendChild(input);
  input.focus();
};
// Actualizar posesión
function actualizarPosesion() {
  const el = document.getElementById("tiempoPosesion");
  el.textContent = tiempoPosesion;
  if (tiempoPosesion <= 10) {                                            // Los número se ponen rojos si baja de los 10 segundos
    el.classList.add("rojo-posicion"); 
  } else {
    el.classList.remove("rojo-posicion");
  }
}

// TARJETAS
const tarjetas = {                                                       // Almacén tarjetas
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }};
const MAX_TARJETAS = 2;                                                  // Máximo de tarjetas
// Añadir o quitar tarjetas
function manejarTarjeta(equipo, tipo, operacion) {
  const lista = tarjetas[equipo][tipo];                                  // Lista tarjetas actual
  const extra = document.getElementById(`expulsionesExtra${equipo}`);    // Contenedor visual expulsiones
  const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`); // Contador visual
  // Añadir tarjetas
  if (operacion === "mas") {
    if (tipo === "roja" && lista.length >= MAX_TARJETAS) return;         // Devuelve límite tarjetas
    if (tipo === "amarilla") {
      const expulsionesActivas = Array.from(document.querySelectorAll(`#expulsionesExtra${equipo} .amarilla`)).length;
      if (expulsionesActivas >= MAX_TARJETAS) return;}    
    const tarjeta = document.createElement("div");                       // Crea elemento visual de tarjeta
    tarjeta.className = `tarjeta-nombre ${tipo}`;
    if (tipo === "verde") {
      lista.push(null); 
      cantidad.textContent = lista.length;
      socket.emit('tarjeta', { equipo, tipo, operacion: "mas" });
      return;}
    const input = document.createElement("input");                       // Campo para añadir nombre de jugador
    input.addEventListener("keydown", (e) => {                           // Poner tarjeta al presionar enter
      if (e.key === "Enter" && input.value.trim() !== "") {
        const nombre = document.createElement("span");
        nombre.textContent = input.value;
        input.replaceWith(nombre);
        if (tipo === "amarilla") {                                       // Iniciar cuenta atrás si es amarilla
          const tiempo = document.createElement("span");
          tarjeta.appendChild(tiempo);
          iniciarCuentaAtras(tiempo, tarjeta, equipo, tipo);
        }
        socket.emit('tarjeta', { equipo, tipo, operacion: "mas", nombre: input.value });
      }
    });
    tarjeta.appendChild(input);
    if (tipo === "roja") {extra.prepend(tarjeta);}                       // Ordenar rojas arriba
     else {extra.appendChild(tarjeta);}                                  // Ordenar amarillas abajo
    lista.push(tarjeta);                                                 // Añadir a lista interna
    cantidad.textContent = lista.length;                                 // Actualizar contador
    input.focus();                                                       // Foco en el campo del texto
  }
  // Restar tarjetas
  if (operacion === "menos" && lista.length > 0) {                       
    const tarjeta = lista.pop();
    if (tipo !== "verde") {
      if (tarjeta) tarjeta.remove();
    }
    cantidad.textContent = lista.length;
    socket.emit('tarjeta', { equipo, tipo, operacion: "menos" });
  }
}
// Cuenta atrás tarjetas amarillas
function iniciarCuentaAtras(span, contenedor, equipo, tipo) {
  let tiempo = 120;
  function actualizar() {
    const min = String(Math.floor(tiempo / 60)).padStart(2, "0");
    const seg = String(tiempo % 60).padStart(2, "0");
    span.textContent = `${min}:${seg}`;
  }
  actualizar();
  const intervalo = setInterval(() => {
    tiempo--;
    if (tiempo <= 0) {
      clearInterval(intervalo);
      contenedor.remove();
    } else {
      actualizar(); // Actualizar reloj cada segundo
    }
  }, 1000);
}
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
      // 🔁 Recarga el panel de control
      location.reload();
    }
    // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
    this.value = "1"; // o guarda el valor anterior en una variable
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });
  }
});

// Control para finalizar partido
document.getElementById("part").addEventListener("change", function () {
  const valor = this.value;

  if (valor === "finalizar") {
  if (confirm("¿Quieres finalizar el partido y guardar los datos?")) {
    socket.emit("finalizarPartido");
    alert("✅ Partido guardado correctamente");
    // Opcional: recargar o limpiar la interfaz
    location.reload();
  }
  // Vuelve al valor anterior (por ejemplo, PRIMER TIEMPO)
    this.value = "1"; // o guarda el valor anterior en una variable
  } else {
    socket.emit("cambiarTiempoJuego", { tiempo: parseInt(valor) });
  }
});

// ESCUCHAR EVENTOS EMITIDOS POR EL SERVIDOR
socket.on('goles', (data) => {
  if (data.equipo === 'A') golesA = data.goles;
  if (data.equipo === 'B') golesB = data.goles;
  actualizarResultado();
});

socket.on('cronometroPartido', (data) => {
  tiempoPartido = data.tiempo;
  actualizarCronoPartido();
});

socket.on('cronometroPosesion', (data) => {
  tiempoPosesion = data.tiempo;
  actualizarPosesion();
});

socket.on('tarjeta', (data) => {
  manejarTarjeta(data.equipo, data.tipo, data.operacion);
  actualizar();
});

// NUEVO: ESCUCHAR REINICIO DE ESTADO COMPLETO
socket.on("estadoCompleto", (estado) => {
  // Nombres de equipo
  document.getElementById("nombreA").value = estado.nombres.A;
  document.getElementById("nombreB").value = estado.nombres.B;

  // Goles
  golesA = estado.goles.A;
  golesB = estado.goles.B;
  actualizarResultado();

  // Tiempo de juego
  document.getElementById("part").value = estado.tiempoJuego;

  // Cronómetros
  tiempoPartido = 0;
  tiempoPosesion = estado.tiempoPosesion;
  actualizarCronoPartido();
  actualizarPosesion();

  // Tarjetas
  reiniciarTarjetas(estado.tarjetas);
});

// Función para reiniciar visualmente las tarjetas
function reiniciarTarjetas(tarjetas) {
  ["A", "B"].forEach(equipo => {
    ["amarilla", "roja"].forEach(tipo => {
      const container = document.getElementById(`expulsiones-${equipo}-${tipo}`);
      if (container) container.innerHTML = "";
    });

    const verde = tarjetas[equipo].verde;
    document.getElementById(`verde${equipo}`).textContent = verde;
  });
}