// === script.js actualizado ===

const socket = io();

const tarjetas = {
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }
};

socket.emit("solicitarEstado");

socket.on("estadoCompleto", (estado) => {
  document.getElementById("nombreEquipoA").textContent = estado.nombres.A;
  document.getElementById("nombreEquipoB").textContent = estado.nombres.B;

  document.getElementById("resultadoA").textContent = estado.goles.A;
  document.getElementById("resultadoB").textContent = estado.goles.B;

  let min = Math.floor(estado.tiempoPartido / 60);
  let seg = estado.tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;

  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PENALTIES" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[estado.tiempoJuego];

  document.getElementById("tiempoPosesion").textContent = estado.tiempoPosesion;

  ["A", "B"].forEach(equipo => {
    ["amarilla", "roja"].forEach(tipo => {
      const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
      const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
      contenedor.innerHTML = "";
      tarjetas[equipo][tipo] = [];
      estado.tarjetas[equipo][tipo].forEach(data => {
        const tarjeta = document.createElement("div");
        tarjeta.className = `tarjeta ${tipo}`;
        tarjeta.textContent = data.nombre;
        if (tipo === "amarilla") {
          const span = document.createElement("span");
          tarjeta.appendChild(span);
          iniciarCuentaAtras(span, tarjeta, equipo, tipo);
        }
        contenedor.appendChild(tarjeta);
        tarjetas[equipo][tipo].push(tarjeta);
      });
      cantidad.textContent = tarjetas[equipo][tipo].length;
    });

    tarjetas[equipo].verde = Array(estado.tarjetas[equipo].verde).fill(null);
    document.getElementById(`verde${equipo}-cantidad`).textContent = tarjetas[equipo].verde.length;
  });
});

socket.on("nombreEquipo", (data) => {
  const equipo = data.equipo;
  const nombre = data.nombre;
  document.getElementById(equipo === "A" ? "nombreEquipoA" : "nombreEquipoB").textContent = nombre;
});

socket.on("goles", (data) => {
  document.getElementById(data.equipo === "A" ? "resultadoA" : "resultadoB").textContent = data.goles;
});

socket.on("cronometroPartido", (data) => {
  let minutos = Math.floor(data.tiempo / 60);
  let segundos = data.tiempo % 60;
  document.getElementById("tiempoPartido").textContent = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
});

socket.on("tiempoJuego", (data) => {
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PENALTIES" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[data.tiempo];
});

socket.on("cronometroPosesion", (data) => {
  const el = document.getElementById("tiempoPosesion");
  el.textContent = data.tiempo;

  if (data.tiempo <= 10) {
    el.classList.add("rojo-posicion"); 
  } else {
    el.classList.remove("rojo-posicion");
  }
});

socket.on("tarjeta", (data) => {
  const equipo = data.equipo;
  const tipo = data.tipo;
  const operacion = data.operacion;

  const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  const lista = tarjetas[equipo][tipo];

  if (operacion === "mas") {
    
    if (tipo === "verde") {
      lista.push(null);
      cantidad.textContent = lista.length;
      return;
    }
    const tarjeta = document.createElement("div");
    tarjeta.className = `tarjeta ${tipo}`;
    tarjeta.textContent = data.nombre || tipo.toUpperCase();
    if (tipo === "amarilla") {
      const span = document.createElement("span");
      tarjeta.appendChild(span);
      iniciarCuentaAtras(span, tarjeta, equipo, tipo);
    }
    if (tipo === "roja") {
      contenedor.prepend(tarjeta); 
    } else {
      contenedor.appendChild(tarjeta); 
    }
    
    lista.push(tarjeta);
    cantidad.textContent = lista.length;

  } else if (operacion === "menos" && lista.length > 0) {
    const tarjeta = lista.pop();
    if (tipo !== "verde" && tarjeta) {
      tarjeta.remove();
    }
    cantidad.textContent = lista.length;
  }
});

function iniciarCuentaAtras(span, tarjeta, equipo, tipo) {
  let tiempoRestante = 120;
  const actualizarTiempo = () => {
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    span.textContent = ` (${minutos}:${segundos.toString().padStart(2, "0")})`;
  };

  actualizarTiempo();

  const intervalo = setInterval(() => {
    tiempoRestante--;
    if (tiempoRestante < 0) {
      clearInterval(intervalo);
      tarjeta.remove();
      const lista = tarjetas[equipo][tipo];
      const index = lista.indexOf(tarjeta);
      if (index !== -1) {
        lista.splice(index, 1);
        const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
        cantidad.textContent = lista.length;
      }
    } else {
      actualizarTiempo();
    }
  }, 1000);
}