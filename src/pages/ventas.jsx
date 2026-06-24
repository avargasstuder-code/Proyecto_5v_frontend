import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/ventas.css";

console.log("Ventas renderizada");
function Ventas({ setIsAuth }) {
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
    nombre: "", rut: "", direccion: "", ciudad_id: "", dia_id: "", telefono: ""
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) window.location.href = "/";
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    console.log("Carrito actualizado:", carrito);
  }, [carrito]);

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
        return {
          producto_id: productoReal.id,
          nombre: productoReal.nombre,
          tipo: productoReal.tipo_venta === "unitario" ? "unidad" : (p.tipo || "carton"),
          cantidad: p.cantidad,
          tipo_venta: productoReal.tipo_venta,
          precio_carton: productoReal.precio_carton,
          precio_medio: productoReal.precio_medio,
          precio_unitario: productoReal.precio_unitario
        };
      }).filter(Boolean);
      setCarrito(carritoFormateado);
      localStorage.removeItem("carritoRapido");
    }
    localStorage.removeItem("clienteVenta");
  }, [productosLista]);

  const validarRUT = (rut) => {
    rut = rut.replace(/\./g, "").replace("-", "");
    if (rut.length < 2) return false;
    const cuerpo = rut.slice(0, -1);
    let dv = rut.slice(-1).toUpperCase();
    let suma = 0, multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += multiplo * cuerpo[i];
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    const dvEsperado = 11 - (suma % 11);
    let dvFinal = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
    return dv === dvFinal;
  };

  const agregarProducto = (producto) => {
    console.log("ANTES:", carrito.length);

    setCarrito(prev => {
      const nuevo = [...prev];
      nuevo.push(item);
      return nuevo;
    });
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => {
      const precio = item.tipo_venta === "unitario"
        ? item.precio_unitario
        : item.tipo === "carton" ? item.precio_carton : item.precio_medio;
      return acc + precio * item.cantidad;
    }, 0);
  };

  const eliminarProducto = (index) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  // cambio de tipo con spread
  const cambiarTipo = (i, valor) => {
    setCarrito(carrito.map((item, idx) =>
      idx === i ? { ...item, tipo: valor } : item
    ));
  };

  // cambio de cantidad con spread
  const cambiarCantidad = (i, valor) => {
    setCarrito(carrito.map((item, idx) =>
      idx === i ? { ...item, cantidad: Number(valor) } : item
    ));
  };

  const vender = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");
    if (!clienteSeleccionado) return alert("Debes seleccionar un cliente");
    if (!metodoPago) return alert("Selecciona método de pago");
    if (metodoPago === "cheque" && diasCheque <= 0) return alert("Ingresa los días del cheque");

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
      alert(error.response?.data?.error || "Error al vender");
    }
  };

  const crearCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.rut || !nuevoCliente.ciudad_id || !nuevoCliente.dia_id) {
      return alert("Nombre, RUT, ciudad y día son obligatorios");
    }
    if (!validarRUT(nuevoCliente.rut)) return alert("RUT inválido");
    try {
      const res = await api.post("/clientes", nuevoCliente);
      const clientesActualizados = await api.get("/clientes");
      setClientes(clientesActualizados.data);
      setClienteSeleccionado(res.data.id);
      setMostrarNuevoCliente(false);
      setNuevoCliente({ nombre: "", rut: "", direccion: "", ciudad_id: "", dia_id: "", telefono: "" });
      alert("Cliente creado");
    } catch (error) {
      alert(error.response?.data?.error || "Error al crear cliente");
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
  console.log("Mostrando carrito");
  } else {
    console.log("Mostrando productos");
  }
  
  console.log("Carrito:", carrito);
  console.log("Productos:", productos.length);

  if (paso === 2) {
    return (
      <div className="container">
        <div className="carrito-header">
          <button className="btn-volver" onClick={() => setPaso(1)}>← Volver</button>
          <h1>Carrito</h1>
        </div>

        <div className="carrito-lista">
          {carrito.length === 0 && <p>No hay productos en el carrito.</p>}
          {carrito.map((item, i) => (
            <div key={item.producto_id + "-" + i} className="item-carrito">
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
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={(e) => cambiarCantidad(i, e.target.value)}
                />
                <button className="btn-eliminar" onClick={() => eliminarProducto(i)}>❌</button>
              </div>
            </div>
          ))}
        </div>

        <div className="total-box">
          <span>Total</span>
          <span className="total-monto">${calcularTotal()}</span>
        </div>

        <div className="card-seccion">
          <h2>Cliente</h2>
          <div className="cliente-box">
            <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} className="input">
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.rut}</option>)}
            </select>
            <button className="btn-secundario" onClick={() => setMostrarNuevoCliente(true)}>+ Nuevo</button>
          </div>
        </div>

        <div className="card-seccion">
          <h2>Método de Pago</h2>
          <div className="metodos">
            {["efectivo", "transferencia", "cheque"].map(m => (
              <button key={m} className={metodoPago === m ? "metodo activo" : "metodo"}
                onClick={() => setMetodoPago(m)}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {metodoPago === "cheque" && (
            <input className="input" type="number" placeholder="Días del cheque"
              value={diasCheque} onChange={(e) => setDiasCheque(Number(e.target.value))} />
          )}
        </div>

        <button className="btn-vender" onClick={vender}>Confirmar venta</button>

        {mostrarNuevoCliente && (
          <div className="modal">
            <div className="modal-content">
              <h2>Nuevo Cliente</h2>
              <input placeholder="Nombre" onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
              <input placeholder="RUT" onChange={(e) => setNuevoCliente({ ...nuevoCliente, rut: e.target.value })} />
              <input placeholder="Dirección" onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
              <select className="input" value={nuevoCliente.ciudad_id}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, ciudad_id: e.target.value })}>
                <option value="">Seleccionar ciudad</option>
                {ciudades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select className="input" value={nuevoCliente.dia_id}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, dia_id: e.target.value })}>
                <option value="">Seleccionar día de visita</option>
                {dias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
              <input placeholder="Teléfono" onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
              <div className="acciones">
                <button onClick={crearCliente}>Guardar</button>
                <button onClick={() => setMostrarNuevoCliente(false)}>Cancelar</button>
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
        <input type="text" placeholder="Buscar producto..." className="input-buscador"
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
                <><span>C: ${p.precio_carton}</span><span>M: ${p.precio_medio}</span></>
              ) : (
                <span>${p.precio_unitario}</span>
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
          🛒 Ver carrito ({carrito.length})
        </button>
      )}
    </div>
  );
}

export default Ventas;