const API_BASE = "https://mindicador.cl/api";
const LOCAL_JSON_PATH = "./assets/data/mindicador.json";

const sel = document.getElementById("moneda");
const montoEl = document.getElementById("monto");
const btn = document.getElementById("buscar");
const resEl = document.getElementById("resultado");
const errEl = document.getElementById("errorBox");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("chart");
let chart;

// Flags
let usingLocalBase = false;   // true si /api falla y usamos JSON local
let usingLocalSerie = false;  // true si /api/{code} falla y usamos serie plana

// Cache de indicadores base
let indicadoresCache = null;

// ==== Utils ====
const fmtCLP = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const fmt2 = n => new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function showError(msg) {
  errEl.textContent = msg;
  errEl.style.display = "block";
}
function clearError() {
  errEl.style.display = "none";
  errEl.textContent = "";
}

// Formatea un valor según la unidad de medida del indicador
function formatByUnit(unidad, valor) {
  const u = String(unidad || "").toLowerCase();
  if (!Number.isFinite(valor)) return "—";
  switch (u) {
    case "pesos": return fmtCLP(valor);
    case "porcentaje":
      return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(valor)}%`;
    case "dólar":
    case "dolar": return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
    default: return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(valor);
  }
}

// Bandera en #status
function setStatus(message = "") {
  let badge = (usingLocalBase || usingLocalSerie) ? "🟡 Datos locales" : "🟢 Datos en vivo";
  statusEl.textContent = `${badge}${message ? " — " + message : ""}`;
}

// Habilita o deshabilita el input de monto según la unidad del indicador
function updateMontoState() {
  if (!indicadoresCache) {
    montoEl.disabled = true;
    montoEl.placeholder = "Cargando…";
    return;
  }
  const code = sel.value;
  const nodo = indicadoresCache[code];
  const unidad = String(nodo?.unidad_medida || "");
  const isPesos = unidad.toLowerCase() === "pesos";

  montoEl.disabled = !isPesos;
  montoEl.placeholder = isPesos ? "25000" : "Este indicador no requiere monto";
  if (!isPesos) montoEl.value = "";
}

// Fallback helpers
async function getIndicadores() {
  usingLocalBase = false;
  try {
    const res = await fetch(API_BASE, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    usingLocalBase = true;
    console.warn("⚠️ API base caída, usando JSON local:", e.message || e);
    const resLocal = await fetch(LOCAL_JSON_PATH, { cache: "no-store" });
    if (!resLocal.ok) throw new Error("No se pudo cargar el JSON local de indicadores.");
    return await resLocal.json();
  }
}

/**
 * Intenta traer la serie real; si falla, crea serie "plana" de 10 puntos
 * con el valor actual del JSON base.
 */
async function getSerie(code, indicadoresBase) {
  usingLocalSerie = false;
  try {
    const res = await fetch(`${API_BASE}/${code}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.serie) || data.serie.length === 0) throw new Error("Serie vacía");
    return data.serie;
  } catch (e) {
    usingLocalSerie = true;
    console.warn(`⚠️ API serie (${code}) caída; genero serie plana con valor local:`, e.message || e);
    const nodo = indicadoresBase?.[code];
    const valor = nodo && typeof nodo.valor === "number" ? nodo.valor : null;
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("No hay valor actual válido en el JSON local para construir la serie.");
    }
    const hoy = new Date();
    return Array.from({ length: 10 }).map((_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      return { fecha: d.toISOString(), valor };
    });
  }
}

// Poblar select con los objetos válidos
async function bootstrapSelect() {
  try {
    setStatus("Cargando indicadores…");
    clearError();

    indicadoresCache = await getIndicadores();

    sel.innerHTML = '<option value="" disabled selected>Seleccione indicador</option>';

    const opciones = [];
    for (const key in indicadoresCache) {
      const nodo = indicadoresCache[key];
      if (nodo && typeof nodo === "object" && "codigo" in nodo && "valor" in nodo) {
        opciones.push({
          code: String(nodo.codigo),
          label: `${nodo.nombre} (${nodo.codigo})`,
        });
      }
    }
    opciones.sort((a, b) => a.label.localeCompare(b.label, "es"));

    for (const op of opciones) {
      const opt = document.createElement("option");
      opt.value = op.code;
      opt.textContent = op.label;
      sel.appendChild(opt);
    }

    updateMontoState();
    setStatus("Listo");
  } catch (err) {
    showError(err.message || "Error al cargar indicadores.");
    setStatus("");
  }
}

// 2) Conversión / Gráfico
async function convertir() {
  clearError();
  resEl.textContent = "…";

  const code = sel.value;
  if (!code) { showError("Selecciona un indicador."); return; }

  //Asegurar base lista
  if (!indicadoresCache) indicadoresCache = await getIndicadores();
  const nodo = indicadoresCache[code];
  if (!nodo || typeof nodo.valor !== "number") {
    showError("Indicador no disponible en este momento.");
    return;
  }

  const unidad = String(nodo.unidad_medida || "").toLowerCase();
  const requiereMonto = unidad === "pesos";

  // Solo exigir monto si la unidad es Pesos
  let monto = null;
  if (requiereMonto) {
    monto = Number(String(montoEl.value).replace(/\./g, "").replace(/,/g, "."));
    if (!monto || monto <= 0) { showError("Ingresa un monto válido en CLP."); return; }
  }

  try {
    btn.disabled = true;
    setStatus("Cargando datos…");

    // Serie con fallback
    const serie = await getSerie(code, indicadoresCache);
    if (!Array.isArray(serie) || serie.length === 0) throw new Error("No hay datos de serie.");

    const valorActual = Number(serie[0].valor);
    if (!Number.isFinite(valorActual) || valorActual <= 0) throw new Error("Valor actual inválido.");

    // Resultado
    if (requiereMonto) {
      const convertido = monto / valorActual;
      const symbol = code === "dolar" ? "US$" : (code === "euro" ? "€" : "$");
      resEl.textContent = `Resultado: ${symbol} ${fmt2(convertido)} (valor actual: ${formatByUnit(nodo.unidad_medida, valorActual)})`;
    } else {
      resEl.textContent = `Valor actual: ${formatByUnit(nodo.unidad_medida, valorActual)}`;
    }

    // Gráfico (10 últimos puntos, en orden ascendente)
    const ultimos10 = serie.slice(0, 10).reverse();
    const labels = ultimos10.map(p => new Date(p.fecha).toLocaleDateString("es-CL"));
    const values = ultimos10.map(p => Number(p.valor));

    const dataChart = {
      labels,
      datasets: [{
        label: `${nodo.nombre} — últimos 10`,
        data: values,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, .15)",
        borderWidth: 2,
        pointRadius: 3,
        tension: .25,
        fill: true
      }]
    };

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "line",
      data: dataChart,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatByUnit(nodo.unidad_medida, ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "Fecha" } },
          y: {
            title: { display: true, text: `Valor (${nodo.unidad_medida})` },
            ticks: {
              callback: v => formatByUnit(nodo.unidad_medida, v)
            },
            beginAtZero: false
          }
        }
      }
    });

    setStatus(`Actualizado: ${new Date().toLocaleTimeString("es-CL")}`);
  } catch (err) {
    showError(err.message || "Ocurrió un error realizando la operación.");
    setStatus("");
  } finally {
    btn.disabled = false;
  }
}

//Eventos
btn.addEventListener("click", convertir);
sel.addEventListener("change", () => {
  clearError();
  resEl.textContent = "…";
  updateMontoState();
});
montoEl.addEventListener("keydown", e => { if (e.key === "Enter") convertir(); });

//Inicio
bootstrapSelect();
