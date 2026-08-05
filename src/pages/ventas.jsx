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
  const [clientes, setClientes] = useState([]);
  const [productosLista, setProductosLista] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [paso, setPaso] = useState(1);
  const [deudaCliente, setDeudaCliente] = useState([]);
  const [mostrarAvisoDeuda, setMostrarAvisoDeuda] = useState(false);
  const [cobrosSeleccionados, setCobrosSeleccionados] = useState([]);
  const [enviandoVenta, setEnviandoVenta] = useState(false);

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
      const [productosRes, clientesRes, categoriasRes] =
        await Promise.all([
          api.get("/productos"),
          api.get("/clientes"),
          api.get("/categorias")
        ]);
      setProductos(productosRes.data);
      setProductosLista(productosRes.data);
      setClientes(clientesRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error(error);
      alert("Error cargando datos");
    }
  };

  useEffect(() => {
    if (productosLista.length === 0) return;
    const clienteGuardado = localStorage.getItem("clienteVenta");
    const carritoGuardado = localStorage.getItem("carritoRapido");
    if (clienteGuardado) setClienteSeleccionado(JSON.parse(clienteGuardado).id);
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
    localStorage.removeItem("clienteVenta");
  }, [productosLista]);

  // Cada vez que se elige un cliente distinto, chequeamos si tiene
  // cheques o créditos pendientes de cobro
  useEffect(() => {
    if (!clienteSeleccionado) {
      setDeudaCliente([]);
      setCobrosSeleccionados([]);
      return;
    }

    api.get(`/clientes/${clienteSeleccionado}/deuda`)
      .then(res => setDeudaCliente(res.data.deudas || []))
      .catch((error) => {
        console.error(error);
        setDeudaCliente([]);
      });

    setCobrosSeleccionados([]);
  }, [clienteSeleccionado]);

  const toggleCobro = (ventaId) => {
    setCobrosSeleccionados(prev =>
      prev.includes(ventaId) ? prev.filter(id => id !== ventaId) : [...prev, ventaId]
    );
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
    if (!clienteSeleccionado) return alert("Debes seleccionar un cliente");

    // Si el cliente tiene deuda pendiente, mostramos el aviso primero
    // y esperamos confirmación antes de vender
    if (deudaCliente.length > 0) {
      setMostrarAvisoDeuda(true);
      return;
    }

    confirmarVentaFinal();
  };

  const confirmarVentaFinal = async () => {
    // Protección extra por si se llega a llamar dos veces casi
    // simultáneo (ej: doble tap en el botón "Continuar igual")
    if (enviandoVenta) return;

    setEnviandoVenta(true);
    setMostrarAvisoDeuda(false);

    try {
      // Si el vendedor cobró alguna deuda pendiente en el momento
      // (marcada con el checkbox del aviso), la cerramos primero
      for (const ventaId of cobrosSeleccionados) {
        const deuda = deudaCliente.find(d => d.id === ventaId);
        if (deuda) {
          await api.post(`/ventas/${ventaId}/abono`, { monto: deuda.saldo });
        }
      }

      await api.post("/ventas", {
        cliente_id: clienteSeleccionado,
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
      setDeudaCliente([]);
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
            <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} className="input">
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} - {c.rut}</option>)}
            </select>

            {deudaCliente.length > 0 && (
              <p className="aviso-deuda-inline">
                ⚠️ Este cliente debe ${formatoCLP(deudaCliente.reduce((acc, d) => acc + Number(d.saldo), 0))}
                {" "}({deudaCliente.length} pago{deudaCliente.length > 1 ? "s" : ""} pendiente{deudaCliente.length > 1 ? "s" : ""})
              </p>
            )}
          </div>
        </div>

        <button className="btn-vender" onClick={vender} disabled={enviandoVenta}>
          {enviandoVenta ? "Confirmando venta..." : "Confirmar venta"}
        </button>

        {mostrarAvisoDeuda && (
          <div className="modal" onClick={() => !enviandoVenta && setMostrarAvisoDeuda(false)}>
            <div className="boleta" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>⚠️ Cliente con deuda pendiente</h3>

              <p style={{ fontSize: 15, marginTop: -8 }}>
                Total pendiente: <b>${formatoCLP(deudaCliente.reduce((acc, d) => acc + Number(d.saldo), 0))}</b>
                {" "}({deudaCliente.length} pago{deudaCliente.length > 1 ? "s" : ""})
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {deudaCliente.map(d => (
                  <label
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      textAlign: "left",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 10
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={cobrosSeleccionados.includes(d.id)}
                      onChange={() => toggleCobro(d.id)}
                      disabled={enviandoVenta}
                    />
                    <span>
                      <b>{d.metodo_pago === "cheque" ? "Cheque" : "Crédito"}</b> · Saldo ${formatoCLP(d.saldo)}
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
                ))}
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