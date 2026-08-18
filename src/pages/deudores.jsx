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
  const [deudores, setDeudores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [montos, setMontos] = useState({}); // { [ventaId]: string }
  const [metodos, setMetodos] = useState({}); // { [ventaId]: { metodo_pago, banco } }
  const [guardandoId, setGuardandoId] = useState(null);

  useEffect(() => {
    cargarDeudores();
  }, []);

  const cargarDeudores = async () => {
    setCargando(true);
    try {
      const res = await api.get("/ventas/deudores");
      setDeudores(res.data);
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

  const cambiarMetodo = (ventaId, metodo_pago) => {
    setMetodos(prev => ({ ...prev, [ventaId]: { metodo_pago, banco: "" } }));
  };

  const cambiarBanco = (ventaId, banco) => {
    setMetodos(prev => ({ ...prev, [ventaId]: { ...prev[ventaId], banco } }));
  };

  const registrarAbono = async (ventaId, saldo) => {
    const montoTexto = montos[ventaId];
    const monto = Number(montoTexto);
    const metodo_pago = metodos[ventaId]?.metodo_pago;
    const banco = metodos[ventaId]?.banco;

    if (!montoTexto || !Number.isFinite(monto) || monto <= 0) {
      alert("Ingresá un monto válido");
      return;
    }

    if (monto > saldo + 1) {
      alert(`El monto no puede ser mayor al saldo pendiente ($${formatoCLP(saldo)})`);
      return;
    }

    if (!metodo_pago) {
      alert("Elegí con qué método te pagaron");
      return;
    }

    if (metodo_pago === "transferencia" && !banco) {
      alert("Elegí el banco de la transferencia");
      return;
    }

    setGuardandoId(ventaId);
    try {
      await api.post(`/ventas/${ventaId}/abono`, {
        monto,
        metodo_pago,
        banco: metodo_pago === "transferencia" ? banco : undefined
      });
      setMontos(prev => ({ ...prev, [ventaId]: "" }));
      setMetodos(prev => ({ ...prev, [ventaId]: { metodo_pago: "", banco: "" } }));
      await cargarDeudores();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al registrar el abono");
    } finally {
      setGuardandoId(null);
    }
  };

  const totalGeneral = deudores.reduce((acc, d) => acc + d.deudaTotal, 0);

  return (
    <div className="container">
      <h1>Deudores</h1>

      {cargando && <p>Cargando...</p>}

      {!cargando && deudores.length === 0 && (
        <p>No hay deudas pendientes 🎉</p>
      )}

      {!cargando && deudores.length > 0 && (
        <>
          <p className="deudores-total-general">
            Deuda total: <b>${formatoCLP(totalGeneral)}</b> · {deudores.length} sucursal(es)
          </p>

          <div className="lista-deudores">
            {deudores.map(deudor => (
              <div key={deudor.sucursal_id} className="tarjeta-deudor">
                <div className="tarjeta-deudor-header">
                  <span className="nombre">
                    {deudor.cliente_nombre} {deudor.cliente_apellido}
                  </span>
                  <span className="direccion">{deudor.sucursal_direccion}</span>
                  {deudor.telefono && (
                    <span className="telefono">{deudor.telefono}</span>
                  )}
                  <span className="deuda-total">${formatoCLP(deudor.deudaTotal)}</span>
                </div>

                <div className="deudas-detalle">
                  {deudor.deudas.map(d => {
                    const metodoElegido = metodos[d.venta_id]?.metodo_pago || "";

                    return (
                      <div key={d.venta_id} className={`fila-deuda ${d.vencido ? "vencida" : ""}`}>
                        <div className="fila-deuda-info">
                          <span>
                            <b>{d.metodo_pago === "cheque_fecha" ? "Cheque a fecha" : "Crédito"}</b>
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

                          <select
                            value={metodoElegido}
                            onChange={(e) => cambiarMetodo(d.venta_id, e.target.value)}
                          >
                            <option value="">¿Con qué te pagó?</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="deposito">Depósito</option>
                            <option value="cheque_dia">Cheque al día</option>
                          </select>

                          {metodoElegido === "transferencia" && (
                            <select
                              value={metodos[d.venta_id]?.banco || ""}
                              onChange={(e) => cambiarBanco(d.venta_id, e.target.value)}
                            >
                              <option value="">Banco</option>
                              <option value="santander">Banco Santander</option>
                              <option value="estado">Banco Estado</option>
                            </select>
                          )}

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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}