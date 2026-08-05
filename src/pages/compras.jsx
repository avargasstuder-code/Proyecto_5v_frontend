import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/ventas.css";
import "../styles/compras.css";

const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

const formatoFecha = (fecha) => {
  return new Date(fecha).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const proveedorVacio = { nombre: "", rut: "", telefono: "", direccion: "" };

// VALIDAR TELÉFONO (9 + 8 dígitos, ej: 912345678). Vacío se permite,
// ya que el teléfono no es obligatorio.
const validarTelefono = (telefono) => {
  if (!telefono || !telefono.trim()) return true;
  const limpio = telefono.replace(/[\s-]/g, "");
  return /^9\d{8}$/.test(limpio);
};

// VALIDAR RUT CHILENO (mismo algoritmo que ya usa Clientes). El RUT de
// proveedor es opcional, así que solo se valida si se escribió algo.
const validarRUT = (rut) => {
  if (!rut || !rut.trim()) return true;

  const limpio = rut.replace(/\./g, "").replace("-", "");
  if (limpio.length < 2) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();
  let suma = 0, multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += multiplo * cuerpo[i];
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const dvEsperado = 11 - (suma % 11);
  const dvFinal = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();

  return dv === dvFinal;
};

export default function Compras() {
  const [vista, setVista] = useState("registrar"); // "registrar" | "historial"

  // Registrar compra
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [paso, setPaso] = useState(1);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [enviandoCompra, setEnviandoCompra] = useState(false);

  // Nuevo proveedor (modal)
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState(proveedorVacio);

  // Historial
  const [compras, setCompras] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (vista === "historial") cargarHistorial();
  }, [vista]);

  const cargarDatos = async () => {
    try {
      const [productosRes, proveedoresRes] = await Promise.all([
        api.get("/productos"),
        api.get("/proveedores")
      ]);
      setProductos(productosRes.data);
      setProveedores(proveedoresRes.data);
    } catch (error) {
      console.error(error);
      alert("Error cargando datos");
    }
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const res = await api.get("/compras");
      setCompras(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar el historial de compras");
    } finally {
      setCargandoHistorial(false);
    }
  };

  const verDetalleCompra = async (id) => {
    try {
      const res = await api.get(`/compras/${id}`);
      setDetalleCompra(res.data);
      setMostrarDetalle(true);
    } catch (error) {
      console.error(error);
      alert("Error al obtener el detalle");
    }
  };

  // Si el producto ya está en el carrito, no lo duplica
  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const indexExistente = prev.findIndex(item => item.producto_id === producto.id);

      if (indexExistente !== -1) {
        return prev.map((item, i) =>
          i === indexExistente ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }

      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          costo_unitario: 0
        }
      ];
    });
  };

  const eliminarProducto = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const cambiarCantidad = (i, valor) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i ? { ...item, cantidad: Number(valor) || 0 } : item
    ));
  };

  const cambiarCosto = (i, valor) => {
    setCarrito(prev => prev.map((item, idx) =>
      idx === i ? { ...item, costo_unitario: Number(valor) || 0 } : item
    ));
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + item.cantidad * item.costo_unitario, 0);
  };

  const crearProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      return alert("El nombre del proveedor es obligatorio");
    }

    if (!validarRUT(nuevoProveedor.rut)) {
      return alert("RUT inválido");
    }

    if (!validarTelefono(nuevoProveedor.telefono)) {
      return alert("Teléfono inválido. Formato esperado: 912345678 (9 dígitos, empieza con 9)");
    }

    try {
      const res = await api.post("/proveedores", nuevoProveedor);
      setProveedores(prev => [...prev, res.data]);
      setProveedorSeleccionado(res.data.id);
      setNuevoProveedor(proveedorVacio);
      setMostrarNuevoProveedor(false);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al crear proveedor");
    }
  };

  const confirmarCompra = async () => {
    if (enviandoCompra) return;

    if (carrito.length === 0) return alert("El carrito está vacío");
    if (!proveedorSeleccionado) return alert("Debes seleccionar un proveedor");

    for (const item of carrito) {
      if (!item.cantidad || item.cantidad <= 0) {
        return alert(`Cantidad inválida para ${item.nombre}`);
      }
      if (item.costo_unitario < 0) {
        return alert(`Costo inválido para ${item.nombre}`);
      }
    }

    setEnviandoCompra(true);
    try {
      await api.post("/compras", {
        proveedor_id: proveedorSeleccionado,
        productos: carrito.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario
        }))
      });

      alert("Compra registrada");
      setCarrito([]);
      setProveedorSeleccionado("");
      setPaso(1);
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al registrar la compra");
    } finally {
      setEnviandoCompra(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    (p?.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="container">
      <h1>Compras</h1>

      <div className="compras-tabs">
        <button
          className={vista === "registrar" ? "activo" : ""}
          onClick={() => setVista("registrar")}
        >
          Registrar compra
        </button>
        <button
          className={vista === "historial" ? "activo" : ""}
          onClick={() => setVista("historial")}
        >
          Historial
        </button>
      </div>

      {vista === "registrar" && paso === 1 && (
        <>
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            className="input-buscador"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div className="header-lista">
            <span>Producto</span><span>Stock actual</span><span></span><span>Acción</span>
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
                <div></div>
                <div className="acciones-lista">
                  <button onClick={() => agregarProducto(p)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {carrito.length > 0 && (
            <button className="btn-flotante" onClick={() => setPaso(2)}>
              Ver compra ({carrito.length})
            </button>
          )}
        </>
      )}

      {vista === "registrar" && paso === 2 && (
        <>
          <div className="carrito-header">
            <button className="btn-volver" onClick={() => setPaso(1)}>← Volver</button>
            <h1>Detalle de la compra</h1>
          </div>

          <div className="carrito-lista">
            {carrito.length === 0 && <p>No hay productos agregados.</p>}
            {carrito.map((item, i) => (
              <div key={i} className="item-carrito">
                <div className="item-info">
                  <span className="item-nombre">{item.nombre}</span>
                </div>
                <div className="item-controles item-controles-compra">
                  <div className="campo-compra">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(i, e.target.value)}
                    />
                  </div>
                  <div className="campo-compra">
                    <label>Costo unitario</label>
                    <input
                      type="number"
                      min="0"
                      value={item.costo_unitario}
                      onChange={(e) => cambiarCosto(i, e.target.value)}
                    />
                  </div>
                  <span className="subtotal-compra">
                    ${formatoCLP(item.cantidad * item.costo_unitario)}
                  </span>
                  <button className="btn-eliminar" onClick={() => eliminarProducto(i)}>❌</button>
                </div>
              </div>
            ))}
          </div>

          <div className="total-box">
            <span>Total</span>
            <span className="total-monto">${formatoCLP(calcularTotal())}</span>
          </div>

          <div className="card-seccion">
            <h2>Proveedor</h2>
            <div className="cliente-box">
              <select
                value={proveedorSeleccionado}
                onChange={(e) => setProveedorSeleccionado(e.target.value)}
                className="input"
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}{p.rut ? ` - ${p.rut}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secundario-clientes"
                onClick={() => setMostrarNuevoProveedor(true)}
              >
                + Nuevo
              </button>
            </div>
          </div>

          <button className="btn-vender" onClick={confirmarCompra} disabled={enviandoCompra}>
            {enviandoCompra ? "Guardando compra..." : "Confirmar compra"}
          </button>
        </>
      )}

      {vista === "historial" && (
        <>
          {cargandoHistorial && <p>Cargando...</p>}

          {!cargandoHistorial && compras.length === 0 && (
            <p>No hay compras registradas todavía.</p>
          )}

          {!cargandoHistorial && compras.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Proveedor</th>
                  <th>Usuario</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.proveedor}</td>
                    <td>{c.usuario}</td>
                    <td>${formatoCLP(c.total)}</td>
                    <td>{formatoFecha(c.fecha)}</td>
                    <td>
                      <button onClick={() => verDetalleCompra(c.id)}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* MODAL NUEVO PROVEEDOR */}
      {mostrarNuevoProveedor && (
        <div className="modal">
          <div className="modal-content">
            <h2>Nuevo Proveedor</h2>

            <input
              placeholder="Nombre"
              value={nuevoProveedor.nombre}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
            />
            <input
              placeholder="RUT (opcional)"
              value={nuevoProveedor.rut}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, rut: e.target.value })}
            />
            <input
              placeholder="Teléfono (opcional)"
              value={nuevoProveedor.telefono}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, telefono: e.target.value })}
            />
            <input
              placeholder="Dirección (opcional)"
              value={nuevoProveedor.direccion}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, direccion: e.target.value })}
            />

            <div className="acciones">
              <button onClick={crearProveedor}>Guardar</button>
              <button onClick={() => {
                setMostrarNuevoProveedor(false);
                setNuevoProveedor(proveedorVacio);
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE COMPRA */}
      {mostrarDetalle && detalleCompra?.compra && detalleCompra?.productos && (
        <div className="modal">
          <div className="boleta">
            <h2>Detalle de compra</h2>

            <p><b>Proveedor:</b> {detalleCompra.compra.proveedor}</p>
            {detalleCompra.compra.proveedor_rut && (
              <p><b>Rut:</b> {detalleCompra.compra.proveedor_rut}</p>
            )}
            <p><b>Registrada por:</b> {detalleCompra.compra.usuario}</p>
            <p><b>Fecha:</b> {formatoFecha(detalleCompra.compra.fecha)}</p>

            <hr />

            {detalleCompra.productos.map((p, i) => (
              <div key={i} className="boleta-item">
                <strong>{p.nombre}</strong>
                <span>Cantidad: {p.cantidad}</span>
                <span>Costo unit.: ${formatoCLP(p.costo_unitario)}</span>
                <span>Subtotal: ${formatoCLP(p.cantidad * p.costo_unitario)}</span>
              </div>
            ))}

            <hr />

            <h3>Total: ${formatoCLP(detalleCompra.compra.total)}</h3>

            <div className="acciones-boleta">
              <button className="btn-cerrar" onClick={() => setMostrarDetalle(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}