import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/deudores.css";

const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

// Convierte "YYYY-MM-DD" a "DD-MM-AAAA" sin pasar por Date (evita líos de zona horaria)
const formatoFechaCorta = (fechaISO) => {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}-${mes}-${anio}`;
};

const ETIQUETA_ESTADO = {
  pendiente: "Pendiente",
  parcial: "Pago parcial"
};

export default function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [montos, setMontos] = useState({}); // { [ventaId]: string }
  const [guardandoId, setGuardandoId] = useState(null);

  useEffect(() => {
    cargarDeudores();
  }, []);

  const cargarDeudores = async () => {
    setCargando(true);
    try {
      const res = await api.get("/ventas/deudores");
      setClientes(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar el listado de deudores");
    } finally {
      setCargando(false);
    }
  };

  const cambiarMonto = (ventaId, valor) => {
    setMontos(prev => ({ ...prev, [ventaId]: valor }));
  };

  const usarSaldoCompleto = (ventaId, saldo) => {
    setMontos(prev => ({ ...prev, [ventaId]: String(Math.round(saldo)) }));
  };

  const registrarAbono = async (ventaId, saldo) => {
    const montoTexto = montos[ventaId];
    const monto = Number(montoTexto);

    if (!montoTexto || !Number.isFinite(monto) || monto <= 0) {
      alert("Ingresá un monto válido");
      return;
    }

    if (monto > saldo + 1) {
      alert(`El monto no puede ser mayor al saldo pendiente ($${formatoCLP(saldo)})`);
      return;
    }

    setGuardandoId(ventaId);
    try {
      await api.post(`/ventas/${ventaId}/abono`, { monto });
      setMontos(prev => ({ ...prev, [ventaId]: "" }));
      await cargarDeudores();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al registrar el abono");
    } finally {
      setGuardandoId(null);
    }
  };

  const totalGeneral = clientes.reduce((acc, c) => acc + c.deudaTotal, 0);

  return (
    <div className="container">
      <h1>Deudores</h1>

      {cargando && <p>Cargando...</p>}

      {!cargando && clientes.length === 0 && (
        <p>No hay deudas pendientes 🎉</p>
      )}

      {!cargando && clientes.length > 0 && (
        <>
          <p className="deudores-total-general">
            Deuda total: <b>${formatoCLP(totalGeneral)}</b> · {clientes.length} cliente(s)
          </p>

          <div className="lista-deudores">
            {clientes.map(cliente => (
              <div key={cliente.cliente_id} className="tarjeta-deudor">
                <div className="tarjeta-deudor-header">
                  <span className="nombre">
                    {cliente.cliente_nombre} {cliente.cliente_apellido}
                  </span>
                  {cliente.telefono && (
                    <span className="telefono">{cliente.telefono}</span>
                  )}
                  <span className="deuda-total">${formatoCLP(cliente.deudaTotal)}</span>
                </div>

                <div className="deudas-detalle">
                  {cliente.deudas.map(d => (
                    <div key={d.venta_id} className={`fila-deuda ${d.vencido ? "vencida" : ""}`}>
                      <div className="fila-deuda-info">
                        <span>
                          <b>{d.metodo_pago === "cheque" ? "Cheque" : "Crédito"}</b>
                          {" "}· Total ${formatoCLP(d.total)}
                          {d.monto_pagado > 0 && (
                            <> · Abonado ${formatoCLP(d.monto_pagado)}</>
                          )}
                        </span>
                        <span className="saldo">Saldo: ${formatoCLP(d.saldo)}</span>
                        <span className="meta">
                          {ETIQUETA_ESTADO[d.estado_pago]} · Vence {formatoFechaCorta(d.vencimiento)}
                          {d.vencido && <span className="badge-vencido"> VENCIDO</span>}
                        </span>
                      </div>

                      <div className="fila-deuda-controles">
                        <input
                          type="number"
                          min="1"
                          max={d.saldo}
                          placeholder="Monto"
                          value={montos[d.venta_id] || ""}
                          onChange={(e) => cambiarMonto(d.venta_id, e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-secundario"
                          onClick={() => usarSaldoCompleto(d.venta_id, d.saldo)}
                        >
                          Todo
                        </button>
                        <button
                          type="button"
                          className="btn-guardar-fila"
                          disabled={guardandoId === d.venta_id}
                          onClick={() => registrarAbono(d.venta_id, d.saldo)}
                        >
                          {guardandoId === d.venta_id ? "Guardando..." : "Registrar pago"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}