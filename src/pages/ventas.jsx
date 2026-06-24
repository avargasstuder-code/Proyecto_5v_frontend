import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/ventas.css";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [dias, setDias] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [diasCheque, setDiasCheque] = useState(0);

  const [paso, setPaso] = useState(1);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    rut: "",
    direccion: "",
    ciudad_id: "",
    dia_id: "",
    telefono: ""
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [p, c, ciu, cat, d] = await Promise.all([
        api.get("/productos"),
        api.get("/clientes"),
        api.get("/ciudades"),
        api.get("/categorias"),
        api.get("/clientes/dias")
      ]);

      setProductos(p.data);
      setClientes(c.data);
      setCiudades(ciu.data);
      setCategorias(cat.data);
      setDias(d.data);
    } catch (e) {
      console.error(e);
      alert("Error cargando datos");
    }
  };

  // 🔥 carrito robusto (evita bugs en móvil)
  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(p => p.producto_id === producto.id);

      if (existe) {
        return prev.map(p =>
          p.producto_id === producto.id
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      }

      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          tipo: producto.tipo_venta === "unitario" ? "unidad" : "carton",
          tipo_venta: producto.tipo_venta,
          cantidad: 1,
          precio_carton: producto.precio_carton,
          precio_medio: producto.precio_medio,
          precio_unitario: producto.precio_unitario
        }
      ];
    });
  };

  const cambiarCantidad = (i, val) => {
    setCarrito(prev =>
      prev.map((item, idx) =>
        idx === i ? { ...item, cantidad: Number(val) } : item
      )
    );
  };

  const cambiarTipo = (i, val) => {
    setCarrito(prev =>
      prev.map((item, idx) =>
        idx === i ? { ...item, tipo: val } : item
      )
    );
  };

  const eliminar = (i) => {
    setCarrito(prev => prev.filter((_, idx) => idx !== i));
  };

  const total = () =>
    carrito.reduce((acc, i) => {
      const precio =
        i.tipo_venta === "unitario"
          ? i.precio_unitario
          : i.tipo === "carton"
          ? i.precio_carton
          : i.precio_medio;

      return acc + precio * i.cantidad;
    }, 0);

  const productosFiltrados = productos.filter(p => {
    const nombre = p?.nombre || "";
    return (
      nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      (!categoriaSeleccionada || p.categoria_id == categoriaSeleccionada)
    );
  });

  const vender = async () => {
    if (!carrito.length) return alert("Carrito vacío");

    try {
      await api.post("/ventas", {
        cliente_id: clienteSeleccionado,
        metodo_pago: metodoPago,
        dias_cheque: metodoPago === "cheque" ? diasCheque : null,
        productos: carrito.map(i => ({
          producto_id: i.producto_id,
          tipo: i.tipo,
          cantidad: i.cantidad
        }))
      });

      alert("Venta realizada");
      setCarrito([]);
      setPaso(1);
      setMetodoPago("");
      setDiasCheque(0);
      cargarDatos();
    } catch (e) {
      console.error(e);
      alert("Error al vender");
    }
  };

  // =========================
  // PASO 2 - CARRITO
  // =========================
  if (paso === 2) {
    return (
      <div className="container">
        <div className="carrito-header">
          <button className="btn-volver" onClick={() => setPaso(1)}>
            ← Volver
          </button>
          <h1>Carrito</h1>
        </div>

        <div className="carrito">
          {carrito.length === 0 && <p>No hay productos</p>}

          {carrito.map((item, i) => (
            <div key={item.producto_id + "-" + i} className="item">
              <div>
                <b>{item.nombre}</b>

                {item.tipo_venta !== "unitario" && (
                  <select
                    value={item.tipo}
                    onChange={(e) => cambiarTipo(i, e.target.value)}
                  >
                    <option value="carton">Cartón</option>
                    <option value="medio">Medio</option>
                  </select>
                )}
              </div>

              <input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={(e) => cambiarCantidad(i, e.target.value)}
              />

              <button onClick={() => eliminar(i)}>❌</button>
            </div>
          ))}
        </div>

        <div className="total">Total: ${total()}</div>

        <button className="btn-vender" onClick={vender}>
          Confirmar venta
        </button>
      </div>
    );
  }

  // =========================
  // PASO 1 - PRODUCTOS
  // =========================
  return (
    <div className="container">
      <h1>Ventas</h1>

      <div className="top-bar">
        <input
          className="input-buscador"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="header-lista">
        <span>Producto</span>
        <span>Stock</span>
        <span>Precios</span>
        <span>Acción</span>
      </div>

      {productosFiltrados.map(p => (
        <div key={p.id} className="fila-producto">
          <div className="info">
            <span className="nombre">{p.nombre}</span>
            <span className="codigo">{p.categoria || ""}</span>
          </div>

          <div className="stock">
            <span className="stock-label">Stock</span>
            <span className="stock-valor">{p.stock}</span>
          </div>

          <div className="precios">
            {p.tipo_venta === "cigarro" ? (
              <>
                <span>C: ${p.precio_carton}</span>
                <span>M: ${p.precio_medio}</span>
              </>
            ) : (
              <span>${p.precio_unitario}</span>
            )}
          </div>

          <div className="acciones-lista">
            <button onClick={() => agregarProducto(p)}>
              +
            </button>
          </div>
        </div>
      ))}

      {/* 🔥 BOTÓN FLOTANTE (lo que querías) */}
      {carrito.length > 0 && (
        <button className="btn-flotante" onClick={() => setPaso(2)}>
          🛒 Ver carrito ({carrito.length})
        </button>
      )}
    </div>
  );
}

export default Ventas;