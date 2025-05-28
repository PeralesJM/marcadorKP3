const socket = io();

const tarjetas = {
  A: { amarilla: [], roja: [], verde: [] },
  B: { amarilla: [], roja: [], verde: [] }
};

const tarjetasActivas = [];
let tarjetasPausadas = false;

socket.emit("solicitarEstado");

socket.on("estadoCompleto", (estado) => {
  document.getElementById("nombreEquipoA").textContent = estado.nombres.A;
  document.getElementById("nombreEquipoB").textContent = estado.nombres.B;

  document.getElementById("resultadoA").textContent = estado.goles.A;
  document.getElementById("resultadoB").textContent = estado.goles.B;

  let min = Math.floor(estado.tiempoPartido / 60);
  let seg = estado.tiempoPartido % 60;
  document.getElementById("tiempoPartido").textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;

  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };
  document.getElementById("tiempo-juego").textContent = tiempoTexto[estado.tiempoJuego];

  document.getElementById("tiempoPosesion").textContent = estado.tiempoPosesion;

  ["A", "B"].forEach(equipo => {
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  contenedor.innerHTML = ""; // Limpiar una sola vez por equipo

  ["amarilla", "roja", "verde"].forEach(tipo => {
    const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
    tarjetas[equipo][tipo] = [];

    estado.tarjetas[equipo][tipo].forEach(data => {
      const tarjeta = document.createElement("div");
      tarjeta.className = `tarjeta ${tipo}`;

      const nombre = document.createElement("span");
      nombre.className = "tarjeta-nombre";
      nombre.textContent = data.nombre;
      tarjeta.appendChild(nombre);

      // Siempre incluir temporizador, sin importar el tipo
      const span = document.createElement("span");
      tarjeta.appendChild(span);
      iniciarCuentaAtras(span, tarjeta, equipo, tipo, data.timestamp, tarjetasPausadas); // 👈 Aquí va siempre el timestamp

      insertarTarjetaOrdenada(contenedor, tarjeta, tipo);
      tarjetas[equipo][tipo].push(tarjeta);
    });

    if (cantidad) {
      cantidad.textContent = tarjetas[equipo][tipo].length;
    }
  });
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
  const tiempoTexto = { 1: "PRIMER TIEMPO", 2: "SEGUNDO TIEMPO", 3: "PRORROGA" };
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
  const { equipo, tipo, operacion, nombre } = data;

  const cantidad = document.getElementById(`${tipo}${equipo}-cantidad`);
  const contenedor = document.getElementById(`expulsionesExtra${equipo}`);
  const lista = tarjetas[equipo][tipo];

  if (operacion === "mas") {
    const tarjeta = document.createElement("div");
    tarjeta.className = `tarjeta ${tipo}`;

    const spanNombre = document.createElement("span");
    spanNombre.className = "tarjeta-nombre";
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
      if (tarjeta) tarjeta.remove();
      cantidad.textContent = lista.length;
    }
  });
  
socket.on("pausarTarjetas", () => {
  tarjetasPausadas = true;
  pausarTodasLasTarjetas();
});

socket.on("reanudarTarjetas", () => {
  tarjetasPausadas = false;
  reanudarTodasLasTarjetas();
});


function insertarTarjetaOrdenada(contenedor, tarjeta, tipo) {
  if (tipo === "roja") {
    contenedor.prepend(tarjeta);
  } else if (tipo === "verde") {
    contenedor.appendChild(tarjeta);
  } else {
    // Insertar después de las rojas pero antes de las verdes
    const rojas = contenedor.querySelectorAll(".tarjeta-nombre.roja").length;
    const verdes = contenedor.querySelectorAll(".tarjeta-nombre.verde");
    if (verdes.length > 0) {
      contenedor.insertBefore(tarjeta, verdes[0]);
    } else if (contenedor.children.length > rojas) {
      contenedor.insertBefore(tarjeta, contenedor.children[rojas]);
    } else {
      contenedor.appendChild(tarjeta);
    }
  }
}

function iniciarCuentaAtras(span, contenedor, equipo, tipo, timestamp = Date.now(), pausada = false) {
  const tiempoTotal = 120000; // 2 minutos

  const tarjetaInfo = {
    intervalo: null,
    timestamp,
    pausadoEn: null,
    span,
    contenedor,
    equipo,
    tipo
  };

  const getTiempoRestante = () => {
    return Math.max(0, Math.floor((tiempoTotal - (Date.now() - tarjetaInfo.timestamp)) / 1000));
  };

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
      tarjetaInfo.span.textContent = ` ${min}:${seg}`;
    }
  };

  actualizarCuentaAtras();

  if (!pausada) {
    tarjetaInfo.intervalo = setInterval(actualizarCuentaAtras, 1000);
  } else {
    // Si está pausada, guardamos la marca de pausa inmediatamente
    tarjetaInfo.pausadoEn = Date.now();
  }

  tarjetasActivas.push(tarjetaInfo);
}


function pausarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => {
    if (t.intervalo) {
      clearInterval(t.intervalo);
      t.intervalo = null;
      t.pausadoEn = Date.now();
    }
  });
}

function reanudarTodasLasTarjetas() {
  tarjetasActivas.forEach(t => {
    // Si ya hay un intervalo activo, no hacer nada
    if (t.intervalo) return;

    if (t.pausadoEn) {
      const pausaDuracion = Date.now() - t.pausadoEn;
      t.timestamp += pausaDuracion;
      t.pausadoEn = null;
    }

    const tiempoTotal = 120000; // 2 minutos
    const getTiempoRestante = () => {
      return Math.max(0, Math.floor((tiempoTotal - (Date.now() - t.timestamp)) / 1000));
    };

    const actualizarCuentaAtras = () => {
      const tiempoRestante = getTiempoRestante();
      if (tiempoRestante <= 0) {
        clearInterval(t.intervalo);
        t.contenedor.remove();
        const index = tarjetasActivas.indexOf(t);
        if (index !== -1) tarjetasActivas.splice(index, 1);
      } else {
        const min = String(Math.floor(tiempoRestante / 60));
        const seg = String(tiempoRestante % 60).padStart(2, "0");
        t.span.textContent = ` ${min}:${seg}`;
      }
    };

    actualizarCuentaAtras(); // Actualiza inmediatamente al reanudar
    t.intervalo = setInterval(actualizarCuentaAtras, 1000);
  });
}

// GENERACION QR
new QRCode(document.getElementById("QR"), {
  text: "https://marcadorkp.onrender.com/index2.html",
});