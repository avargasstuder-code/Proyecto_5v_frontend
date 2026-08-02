import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/cierre_dia.css";

const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito", label: "Depósito" },
  { value: "cheque", label: "Cheque" },
  { value: "credito", label: "Crédito" }
];

const REQUIERE_DIAS = ["cheque", "credito"];

const ETIQUETA_METODO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  deposito: "Depósito",
  cheque: "Cheque",
  credito: "Crédito",
  sin_definir: "Sin definir"
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const pad2 = (n) => String(n).padStart(2, "0");

// Cuántos días tiene un mes (contempla años bisiestos para febrero)
const diasEnMes = (mes, anio) => new Date(anio, mes, 0).getDate();

// Selector de fecha propio (día / mes / año en español), para no
// depender del idioma/formato que tenga configurado el navegador
function SelectorFecha({ value, onChange }) {
  const [anioSel, mesSel, diaSel] = value.split("-").map(Number);

  const anioActual = new Date().getFullYear();
  const anios = [anioActual - 1, anioActual, anioActual + 1];
  const totalDias = diasEnMes(mesSel, anioSel);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  const actualizar = (dia, mes, anio) => {
    // Si el mes tiene menos días que el día elegido (ej: 31 de febrero),
    // lo ajustamos al último día válido de ese mes
    const maxDia = diasEnMes(mes, anio);
    const diaFinal = Math.min(dia, maxDia);
    onChange(`${anio}-${pad2(mes)}-${pad2(diaFinal)}`);
  };

  return (
    <div className="selector-fecha">
      <select value={diaSel} onChange={(e) => actualizar(Number(e.target.value), mesSel, anioSel)}>
        {dias.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <select value={mesSel} onChange={(e) => actualizar(diaSel, Number(e.target.value), anioSel)}>
        {MESES.map((nombre, i) => (
          <option key={nombre} value={i + 1}>{nombre}</option>
        ))}
      </select>

      <select value={anioSel} onChange={(e) => actualizar(diaSel, mesSel, Number(e.target.value))}>
        {anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}

export default function CierreDia() {
  const [tab, setTab] = useState("pagos"); // "pagos" | "resumen"
  const [fecha, setFecha] = useState(hoyISO());

  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [seleccion, setSeleccion] = useState({}); // { [ventaId]: { metodo_pago, dias } }
  const [guardandoId, setGuardandoId] = useState(null);

  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  useEffect(() => {
    if (tab === "pagos") cargarVentasDelDia();
    if (tab === "resumen") cargarResumen();
  }, [tab, fecha]);

  const cargarVentasDelDia = async () => {
    setCargando(true);
    try {
      const res = await api.get("/ventas/del-dia", { params: { fecha } });
      setVentas(res.data);

      // Precargamos la selección con lo que ya esté guardado
      const inicial = {};
      res.data.forEach(v => {
        inicial[v.id] = {
          metodo_pago: v.metodo_pago || "",
          dias: v.dias_cheque || ""
        };
      });
      setSeleccion(inicial);
    } catch (error) {
      console.error(error);
      alert("Error al cargar las ventas del día");
    } finally {
      setCargando(false);
    }
  };

  const cargarResumen = async () => {
    setCargandoResumen(true);
    try {
      const res = await api.get("/ventas/resumen", { params: { fecha } });
      setResumen(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar el resumen");
    } finally {
      setCargandoResumen(false);
    }
  };

  const cambiarMetodo = (ventaId, metodo_pago) => {
    setSeleccion(prev => ({
      ...prev,
      [ventaId]: { metodo_pago, dias: prev[ventaId]?.dias || "" }
    }));
  };

  const cambiarDias = (ventaId, dias) => {
    setSeleccion(prev => ({
      ...prev,
      [ventaId]: { ...prev[ventaId], dias }
    }));
  };

  const guardarVenta = async (venta) => {
    const sel = seleccion[venta.id];

    if (!sel?.metodo_pago) {
      alert("Elegí un método de pago");
      return;
    }

    if (REQUIERE_DIAS.includes(sel.metodo_pago)) {
      const dias = Number(sel.dias);
      if (!Number.isInteger(dias) || dias <= 0) {
        alert("Indicá los días de plazo (ej: 7 o 15)");
        return;
      }
    }

    setGuardandoId(venta.id);
    try {
      const res = await api.put(`/ventas/${venta.id}/metodo-pago`, {
        metodo_pago: sel.metodo_pago,
        dias: REQUIERE_DIAS.includes(sel.metodo_pago) ? Number(sel.dias) : undefined
      });

      setVentas(prev => prev.map(v => (v.id === venta.id ? { ...v, ...res.data } : v)));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al guardar");
    } finally {
      setGuardandoId(null);
    }
  };

  const totalDia = ventas.reduce((acc, v) => acc + Number(v.total), 0);
  const pendientesPorDefinir = ventas.filter(v => !v.metodo_pago).length;

  return (
    <div className="container">
      <h1>Cierre del día</h1>

      <div className="cierre-tabs">
        <button
          className={tab === "pagos" ? "activo" : ""}
          onClick={() => setTab("pagos")}
        >
          Definir pagos
        </button>
        <button
          className={tab === "resumen" ? "activo" : ""}
          onClick={() => setTab("resumen")}
        >
          Resumen / Cuadre
        </button>
      </div>

      <div className="cierre-fecha">
        <label>Fecha</label>
        <SelectorFecha value={fecha} onChange={setFecha} />
      </div>

      {tab === "pagos" && (
        <>
          {cargando && <p>Cargando ventas...</p>}

          {!cargando && ventas.length === 0 && (
            <p>No hay ventas registradas ese día.</p>
          )}

          {!cargando && ventas.length > 0 && (
            <>
              <p className="cierre-resumen-rapido">
                {ventas.length} venta(s) · Total ${formatoCLP(totalDia)}
                {pendientesPorDefinir > 0 && (
                  <span className="badge-pendiente">
                    {" "}· {pendientesPorDefinir} sin método de pago
                  </span>
                )}
              </p>

              <div className="lista-cierre">
                {ventas.map(v => {
                  const sel = seleccion[v.id] || { metodo_pago: "", dias: "" };
                  const yaGuardado = !!v.metodo_pago;
                  const requiereDias = REQUIERE_DIAS.includes(sel.metodo_pago);

                  return (
                    <div key={v.id} className={`fila-cierre ${yaGuardado ? "guardado" : ""}`}>
                      <div className="fila-cierre-info">
                        <span className="cliente">
                          {v.cliente_nombre} {v.cliente_apellido}
                        </span>
                        <span className="monto">${formatoCLP(v.total)}</span>
                        {yaGuardado && (
                          <span className="estado-guardado">
                            ✔ {ETIQUETA_METODO[v.metodo_pago]}
                            {REQUIERE_DIAS.includes(v.metodo_pago) && ` (${v.dias_cheque} días)`}
                            {v.estado_pago === "pendiente" && " · pendiente de cobro"}
                            {v.estado_pago === "parcial" && " · pago parcial, queda saldo pendiente"}
                          </span>
                        )}
                      </div>

                      <div className="fila-cierre-controles">
                        <select
                          value={sel.metodo_pago}
                          onChange={(e) => cambiarMetodo(v.id, e.target.value)}
                        >
                          <option value="">Elegir método...</option>
                          {METODOS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>

                        {requiereDias && (
                          <div className="dias-plazo">
                            <button type="button" onClick={() => cambiarDias(v.id, 7)}>7 días</button>
                            <button type="button" onClick={() => cambiarDias(v.id, 15)}>15 días</button>
                            <input
                              type="number"
                              min="1"
                              placeholder="Días"
                              value={sel.dias}
                              onChange={(e) => cambiarDias(v.id, e.target.value)}
                            />
                          </div>
                        )}

                        <button
                          className="btn-guardar-fila"
                          disabled={guardandoId === v.id}
                          onClick={() => guardarVenta(v)}
                        >
                          {guardandoId === v.id ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "resumen" && (
        <>
          {cargandoResumen && <p>Cargando resumen...</p>}

          {!cargandoResumen && resumen && (
            <div className="resumen-cuadre">
              {resumen.detalle.length === 0 && <p>No hay ventas registradas ese día.</p>}

              {resumen.detalle.map(r => (
                <div key={r.metodo_pago} className="fila-resumen">
                  <span className="metodo">{ETIQUETA_METODO[r.metodo_pago] || r.metodo_pago}</span>
                  <span className="cantidad">{r.cantidad} venta(s)</span>
                  <span className="monto">${formatoCLP(r.total)}</span>
                </div>
              ))}

              {resumen.detalle.length > 0 && (
                <div className="fila-resumen fila-total">
                  <span className="metodo">Total del día</span>
                  <span className="cantidad"></span>
                  <span className="monto">${formatoCLP(resumen.totalGeneral)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}