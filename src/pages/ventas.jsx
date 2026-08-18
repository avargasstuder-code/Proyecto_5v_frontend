import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/ventas.css";

// Formatea números como pesos chilenos: sin decimales, con punto de miles (ej: 10.000)
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

function Ventas({ setIsAuth }) {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [productosLista, setProductosLista] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [paso, setPaso] = useState(1);
  const [deudaSucursal, setDeudaSucursal] = useState([]);
  const [mostrarAvisoDeuda, setMostrarAvisoDeuda] = useState(false);
  const [cobrosSeleccionados, setCobrosSeleccionados] = useState([]);
  const [cobrosMetodo, setCobrosMetodo] = useState({}); // { [ventaId]: { metodo_pago, banco } }
  const [enviandoVenta, setEnviandoVenta] = useState(false);
  const [metodoPagoVenta, setMetodoPagoVenta] = useState("");

  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch (e) {
    console.error("No se pudo acceder a localStorage:", e);
  }

  useEffect(() => {
    if (!token) window.location.href = "/";
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [productosRes, sucursalesRes, categoriasRes] =
        await Promise.all([
          api.get("/productos"),
          api.get("/sucursales"),
          api.get("/categorias")
        ]);
      setProductos(productosRes.data);
      setProductosLista(productosRes.data);
      setSucursales(sucursalesRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error(error);
      alert("Error cargando datos");
    }
  };

  useEffect(() => {
    if (productosLista.length === 0) return;
    const sucursalGuardado = localStorage.getItem("sucursalVenta");
    const carritoGuardado = localStorage.getItem("carritoRapido");
    if (sucursalGuardado) setSucursalSeleccionada(JSON.parse(sucursalGuardado).id);
    if (carritoGuardado) {
      const prods = JSON.parse(carritoGuardado);
      const carritoFormateado = prods.map(p => {
        const productoReal = productosLista.find(x => x.id === p.id);
        if (!productoReal) return null;
        const tipo = productoReal.tipo_venta === "unitario" ? "unidad" : (p.tipo || "carton");
        return {
          producto_id: productoReal.id,
          nombre: productoReal.nombre,
          tipo,
          cantidad: p.cantidad,
          tipo_venta: productoReal.tipo_venta,
          precio_carton: productoReal.precio_carton,
          precio_medio: productoReal.precio_medio,
          precio_unitario: productoReal.precio_unitario,
          precioManual: productoReal.tipo_venta === "unitario"
            ? Number(productoReal.precio_unitario) || 0
            : Number(tipo === "carton" ? productoReal.precio_carton : productoReal.precio_medio) || 0
        };
      }).filter(Boolean);
      setCarrito(carritoFormateado);
      localStorage.removeItem("carritoRapido");
    }
    localStorage.removeItem("sucursalVenta");
  }, [productosLista]);

  // Cada vez que se elige una sucursal distinta, chequeamos si tiene
  // cheques o créditos pendientes de cobro
  useEffect(() => {
    if (!sucursalSeleccionada) {
      setDeudaSucursal([]);
      setCobrosSeleccionados([]);
      return;
    }

    api.get(`/sucursales/${sucursalSeleccionada}/deuda`)
      .then(res => setDeudaSucursal(res.data.deudas || []))
      .catch((error) => {
        console.error(error);
        setDeudaSucursal([]);
      });

    setCobrosSeleccionados([]);
  }, [sucursalSeleccionada]);

  const toggleCobro = (ventaId) => {
    setCobrosSeleccionados(prev =>
      prev.includes(ventaId) ? prev.filter(id => id !== ventaId) : [...prev, ventaId]
    );
    setCobrosMetodo(prev => {
      const copia = { ...prev };
      delete copia[ventaId];
      return copia;
    });
  };

  const cambiarMetodoCobro = (ventaId, metodo_pago) => {
    setCobrosMetodo(prev => ({ ...prev, [ventaId]: { metodo_pago, banco: "" } }));
  };

  const cambiarBancoCobro = (ventaId, banco) => {
    setCobrosMetodo(prev => ({ ...prev, [ventaId]: { ...prev[ventaId], banco } }));
  };

  // Precio de catálogo para un ítem, según su tipo (carton/medio/unitario)
  const precioCatalogo = (item, tipo = item.tipo) => {
    if (item.tipo_venta === "unitario") return Number(item.precio_unitario) || 0;
    return tipo === "carton" ? Number(item.precio_carton) || 0 : Number(item.precio_medio) || 0;
  };

  // Si el producto ya está en el carrito, solo le suma 1 a la cantidad
  // existente en vez de agregar una fila nueva y duplicada
  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const indexExistente = prev.findIndex(item => item.producto_id === producto.id);

      if (indexExistente !== -1) {
        return prev.map((item, i) =>
          i === indexExistente
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      const tipoInicial = producto.tipo_venta === "unitario" ? "unidad" : "carton";

      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          tipo: tipoInicial,
          cantidad: 1,
          precio_carton: producto.precio_carton,
          precio_medio: producto.precio_medio,
          precio_unitario: producto.precio_unitario,
          tipo_venta: producto.tipo_venta,
          // Precio que se va a cobrar en esta venta puntual. Arranca
          // igual al de catálogo, pero se puede editar sin que eso
          // afecte el precio del producto en el catálogo.
          precioManual: producto.tipo_venta === "unitario"
            ? Number(producto.precio_unitario) || 0
            : Number(producto.precio_carton) || 0
        }
      ];
    });
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + item.precioManual * item.cantidad, 0);
  };

  const eliminarProducto = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const cambiarTipo = (i, valor) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i
        ? { ...item, tipo: valor, precioManual: precioCatalogo(item, valor) }
        : item
    ));
  };

  const cambiarCantidad = (i, valor) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i ? { ...item, cantidad: Number(valor) || 0 } : item
    ));
  };

  const cambiarPrecioManual = (i, valor) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i ? { ...item, precioManual: Number(valor) || 0 } : item
    ));
  };

  const restablecerPrecio = (i) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i ? { ...item, precioManual: precioCatalogo(item) } : item
    ));
  };

  const vender = () => {
    // Si ya se está procesando una venta, ignoramos clics de más
    if (enviandoVenta) return;

    if (carrito.length === 0) return alert("El carrito está vacío");
    if (!sucursalSeleccionada) return alert("Debes seleccionar un cliente");
    if (!metodoPagoVenta) return alert("Elegí si la venta queda en efectivo o pendiente");

    // Si la sucursal tiene deuda pendiente, mostramos el aviso primero
    // y esperamos confirmación antes de vender
    if (deudaSucursal.length > 0) {
      setMostrarAvisoDeuda(true);
      return;
    }

    confirmarVentaFinal();
  };

  const confirmarVentaFinal = async () => {
    // Protección extra por si se llega a llamar dos veces casi
    // simultáneo (ej: doble tap en el botón "Continuar igual")
    if (enviandoVenta) return;

    // Si se marcó cobrar alguna deuda vieja en el momento, hay que
    // saber con qué método se la pagaron antes de mandar nada
    for (const ventaId of cobrosSeleccionados) {
      const metodo = cobrosMetodo[ventaId]?.metodo_pago;
      if (!metodo) {
        return alert("Elegí el método de pago con el que te pagaron la deuda pendiente");
      }
      if (metodo === "transferencia" && !cobrosMetodo[ventaId]?.banco) {
        return alert("Elegí el banco de la transferencia con la que te pagaron la deuda");
      }
    }

    setEnviandoVenta(true);
    setMostrarAvisoDeuda(false);

    try {
      // Si el vendedor cobró alguna deuda pendiente en el momento
      // (marcada con el checkbox del aviso), la cerramos primero
      for (const ventaId of cobrosSeleccionados) {
        const deuda = deudaSucursal.find(d => d.id === ventaId);
        if (deuda) {
          const { metodo_pago, banco } = cobrosMetodo[ventaId];
          await api.post(`/ventas/${ventaId}/abono`, {
            monto: deuda.saldo,
            metodo_pago,
            banco: metodo_pago === "transferencia" ? banco : undefined
          });
        }
      }

      await api.post("/ventas", {
        sucursal_id: sucursalSeleccionada,
        metodo_pago: metodoPagoVenta,
        productos: carrito.map(item => ({
          producto_id: item.producto_id,
          tipo: item.tipo,
          cantidad: item.cantidad,
          precio: item.precioManual
        }))
      });

      alert("Venta realizada");
      setCarrito([]);
      setPaso(1);
      setCobrosSeleccionados([]);
      setCobrosMetodo({});
      setMetodoPagoVenta("");
      setDeudaSucursal([]);
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al vender");
    } finally {
      setEnviandoVenta(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const nombre = p?.nombre || "";

    const coincideBusqueda =
      nombre.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria =
      !categoriaSeleccionada ||
      p.categoria_id == categoriaSeleccionada;

    return coincideBusqueda && coincideCategoria;
  });

  if (paso === 2) {
    return (
      <div className="container">
        <div className="carrito-header">
          <button className="btn-volver" onClick={() => setPaso(1)}>← Volver</button>
          <h1>Carrito</h1>
        </div>

        <div className="carrito-lista">
          {carrito.length === 0 && <p>No hay productos en el carrito.</p>}
          {carrito.map((item, i) => {
            const precioDeCatalogo = precioCatalogo(item);
            const tienePrecioEspecial = item.precioManual !== precioDeCatalogo;

            return (
              <div key={i} className="item-carrito">
                <div className="item-info">
                  <span className="item-nombre">{item.nombre}</span>
                  {item.tipo_venta !== "unitario" && (
                    <select value={item.tipo} onChange={(e) => cambiarTipo(i, e.target.value)}>
                      <option value="carton">Cartón</option>
                      <option value="medio">Medio</option>
                    </select>
                  )}
                </div>
                <div className="item-controles">
                  <div className="precio-manual-box">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(i, e.target.value)}
                    />
                  </div>
                  <div className="precio-manual-box">
                    <label>Precio unit.</label>
                    <input
                      type="number"
                      min="0"
                      value={item.precioManual}
                      onChange={(e) => cambiarPrecioManual(i, e.target.value)}
                      className={tienePrecioEspecial ? "precio-editado" : ""}
                    />
                    {tienePrecioEspecial && (
                      <button
                        type="button"
                        className="btn-restablecer-precio"
                        onClick={() => restablecerPrecio(i)}
                        title={`Precio de catálogo: $${formatoCLP(precioDeCatalogo)}`}
                      >
                        ↺ catálogo
                      </button>
                    )}
                  </div>
                  <button className="btn-eliminar" onClick={() => eliminarProducto(i)}>❌</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="total-box">
          <span>Total</span>
          <span className="total-monto">${formatoCLP(calcularTotal())}</span>
        </div>

        <div className="card-seccion">
          <h2>Cliente</h2>
          <div className="cliente-box">
            <select value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)} className="input">
              <option value="">Seleccionar cliente</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido} - {s.direccion}</option>)}
            </select>

            {deudaSucursal.length > 0 && (
              <p className="aviso-deuda-inline">
                ⚠️ Este cliente debe ${formatoCLP(deudaSucursal.reduce((acc, d) => acc + Number(d.saldo), 0))}
                {" "}({deudaSucursal.length} pago{deudaSucursal.length > 1 ? "s" : ""} pendiente{deudaSucursal.length > 1 ? "s" : ""})
              </p>
            )}
          </div>
        </div>

        <div className="card-seccion">
          <h2>¿Cómo queda esta venta?</h2>
          <div className="metodos">
            <button
              type="button"
              className={`metodo ${metodoPagoVenta === "efectivo" ? "activo" : ""}`}
              onClick={() => setMetodoPagoVenta("efectivo")}
            >
              Efectivo
            </button>
            <button
              type="button"
              className={`metodo ${metodoPagoVenta === "pendiente" ? "activo" : ""}`}
              onClick={() => setMetodoPagoVenta("pendiente")}
            >
              Pendiente
            </button>
          </div>
          {metodoPagoVenta === "pendiente" && (
            <p className="aviso-deuda-inline" style={{ color: "#666" }}>
              Vas a poder definir el método real (crédito, transferencia, etc.) después, en "Método de pago"
            </p>
          )}
        </div>

        <button className="btn-vender" onClick={vender} disabled={enviandoVenta}>
          {enviandoVenta ? "Confirmando venta..." : "Confirmar venta"}
        </button>

        {mostrarAvisoDeuda && (
          <div className="modal" onClick={() => !enviandoVenta && setMostrarAvisoDeuda(false)}>
            <div className="boleta" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>⚠️ Cliente con deuda pendiente</h3>

              <p style={{ fontSize: 15, marginTop: -8 }}>
                Total pendiente: <b>${formatoCLP(deudaSucursal.reduce((acc, d) => acc + Number(d.saldo), 0))}</b>
                {" "}({deudaSucursal.length} pago{deudaSucursal.length > 1 ? "s" : ""})
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {deudaSucursal.map(d => {
                  const marcado = cobrosSeleccionados.includes(d.id);
                  const metodo = cobrosMetodo[d.id]?.metodo_pago || "";

                  return (
                    <div
                      key={d.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 10,
                        textAlign: "left"
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => toggleCobro(d.id)}
                          disabled={enviandoVenta}
                        />
                        <span>
                          <b>{d.metodo_pago === "cheque_fecha" ? "Cheque a fecha" : "Crédito"}</b> · Saldo ${formatoCLP(d.saldo)}
                          {d.monto_pagado > 0 && (
                            <> (ya abonó ${formatoCLP(d.monto_pagado)} de ${formatoCLP(d.total)})</>
                          )}
                          <br />
                          Vence: {formatoFechaCorta(d.vencimiento)}
                          {d.vencido && <span style={{ color: "#c0392b" }}> · VENCIDO</span>}
                          <br />
                          <span style={{ fontSize: 12, color: "#666" }}>
                            Marcá esta casilla si el cliente te paga esto ahora
                          </span>
                        </span>
                      </label>

                      {marcado && (
                        <div style={{ marginTop: 10, marginLeft: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                          <select
                            value={metodo}
                            onChange={(e) => cambiarMetodoCobro(d.id, e.target.value)}
                            disabled={enviandoVenta}
                          >
                            <option value="">¿Con qué te pagó?</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="deposito">Depósito</option>
                            <option value="cheque_dia">Cheque al día</option>
                          </select>

                          {metodo === "transferencia" && (
                            <select
                              value={cobrosMetodo[d.id]?.banco || ""}
                              onChange={(e) => cambiarBancoCobro(d.id, e.target.value)}
                              disabled={enviandoVenta}
                            >
                              <option value="">Banco</option>
                              <option value="santander">Banco Santander</option>
                              <option value="estado">Banco Estado</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="btn-imprimir" onClick={confirmarVentaFinal} disabled={enviandoVenta}>
                  {enviandoVenta ? "Confirmando..." : "Continuar igual"}
                </button>
                <button
                  className="btn-cerrar"
                  onClick={() => setMostrarAvisoDeuda(false)}
                  disabled={enviandoVenta}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PASO 1: PRODUCTOS ──
  return (
    <div className="container">
      <h1>Ventas</h1>

      <div className="top-bar">
        <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)} className="input">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="text" placeholder="🔍 Buscar producto..." className="input-buscador"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="header-lista">
        <span>Producto</span><span>Stock</span><span>Precios</span><span>Acción</span>
      </div>

      <div className="lista-productos">
        {productosFiltrados.map(p => (
          <div key={p.id} className="fila-producto">
            <div className="info">
              <span className="nombre">{p.nombre}</span>
              <span className="codigo">{p.categoria || "Sin categoría"}</span>
            </div>
            <div className="stock">
              <span className="stock-label">Stock</span>
              <span className="stock-valor">{p.stock}</span>
            </div>
            <div className="precios">
              {p.tipo_venta === "cigarro" ? (
                <><span>C: ${formatoCLP(p.precio_carton)}</span><span>M: ${formatoCLP(p.precio_medio)}</span></>
              ) : (
                <span>${formatoCLP(p.precio_unitario)}</span>
              )}
            </div>
            <div className="acciones-lista">
              <button disabled={p.stock <= 0} onClick={() => agregarProducto(p)}>
                {p.stock <= 0 ? "Sin stock" : "+"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <button className="btn-flotante" onClick={() => setPaso(2)}>
          Ver carrito ({carrito.length})
        </button>
      )}
    </div>
  );
}

export default Ventas;