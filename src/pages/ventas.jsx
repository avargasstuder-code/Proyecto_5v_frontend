import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/ventas.css";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productosLista, setProductosLista] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [diasCheque, setDiasCheque] = useState(0);
  const [dias, setDias] = useState([]);
  const [paso, setPaso] = useState(1);

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
      const [productosRes, clientesRes, ciudadesRes, categoriasRes, diasRes] =
        await Promise.all([
          api.get("/productos"),
          api.get("/clientes"),
          api.get("/ciudades"),
          api.get("/categorias"),
          api.get("/clientes/dias")
        ]);

      setProductos(productosRes.data);
      setProductosLista(productosRes.data);
      setClientes(clientesRes.data);
      setCiudades(ciudadesRes.data);
      setCategorias(categoriasRes.data);
      setDias(diasRes.data);
    } catch (error) {
      console.error(error);
      alert("Error cargando datos");
    }
  };

  // 🔥 FIX IMPORTANTE: estado funcional correcto
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
          cantidad: 1,
          precio_carton: producto.precio_carton,
          precio_medio: producto.precio_medio,
          precio_unitario: producto.precio_unitario,
          tipo_venta: producto.tipo_venta
        }
      ];
    });
  };

  const eliminarProducto = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const cambiarTipo = (i, valor) => {
    setCarrito(prev =>
      prev.map((item, idx) =>
        idx === i ? { ...item, tipo: valor } : item
      )
    );
  };

  const cambiarCantidad = (i, valor) => {
    setCarrito(prev =>
      prev.map((item, idx) =>
        idx === i ? { ...item, cantidad: Number(valor) } : item
      )
    );
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => {
      const precio =
        item.tipo_venta === "unitario"
          ? item.precio_unitario
          : item.tipo === "carton"
          ? item.precio_carton
          : item.precio_medio;

      return acc + precio * item.cantidad;
    }, 0);
  };

  const vender = async () => {
    if (!carrito.length) return alert("Carrito vacío");
    if (!clienteSeleccionado) return alert("Selecciona cliente");
    if (!metodoPago) return alert("Selecciona método de pago");

    try {
      await api.post("/ventas", {
        cliente_id: clienteSeleccionado,
        metodo_pago: metodoPago,
        dias_cheque: metodoPago === "cheque" ? diasCheque : null,
        productos: carrito.map(item => ({
          producto_id: item.producto_id,
          tipo: item.tipo,
          cantidad: item.cantidad
        }))
      });

      alert("Venta realizada");
      setCarrito([]);
      setMetodoPago("");
      setDiasCheque(0);
      setPaso(1);
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert("Error al vender");
    }
  };

  const productosFiltrados = productos.filter(p => {
    const nombre = p?.nombre || "";

    return (
      nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      (!categoriaSeleccionada || p.categoria_id == categoriaSeleccionada)
    );
  });

  // =========================
  // PASO 2: CARRITO
  // =========================
  if (paso === 2) {
    return (
      <div className="container">
        <button onClick={() => setPaso(1)}>← Volver</button>

        <h1>Carrito</h1>

        {carrito.map((item, i) => (
          <div key={item.producto_id + "-" + i}>
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

            <input
              type="number"
              value={item.cantidad}
              min="1"
              onChange={(e) => cambiarCantidad(i, e.target.value)}
            />

            <button onClick={() => eliminarProducto(i)}>❌</button>
          </div>
        ))}

        <h2>Total: ${calcularTotal()}</h2>

        <button onClick={vender}>Confirmar venta</button>
      </div>
    );
  }

  // =========================
  // PASO 1: PRODUCTOS
  // =========================
  return (
    <div className="container">
      <h1>Ventas</h1>

      <input
        placeholder="Buscar"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {productosFiltrados.map(p => (
        <div key={p.id}>
          <span>{p.nombre}</span>
          <button onClick={() => agregarProducto(p)}>+</button>
        </div>
      ))}

      {carrito.length > 0 && (
        <button onClick={() => setPaso(2)}>
          Ver carrito ({carrito.length})
        </button>
      )}
    </div>
  );
}

export default Ventas;