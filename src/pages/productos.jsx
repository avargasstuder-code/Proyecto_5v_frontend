import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/productos.css";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [errorCodigo, setErrorCodigo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  const formInicial = {
    nombre: "",
    codigo_barra: "",
    stock: 0,
    categoria_id: "",
    tipo_venta: "cigarro",
    precio_carton: 0,
    precio_medio: 0,
    precio_unitario: 0
  };

  const [form, setForm] = useState(formInicial);

  const obtenerProductos = async () => {
    const res = await api.get("/productos");
    setProductos(res.data);
  };

  

  const validarCodigo = async (codigo) => {
    if (!codigo) return;

    try {
      const res = await api.get(`/productos?codigo=${codigo}`);

      if (res.data.length > 0) {
        setErrorCodigo("Este código ya está registrado");
      } else {
        setErrorCodigo("");
      }

    } catch {
      setErrorCodigo("");
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  useEffect(() => {
    api.get("/categorias").then(res => {
      setCategorias(res.data);
    });
  }, []);

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_barra?.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideCategoria =
      !categoriaSeleccionada || p.categoria_id == categoriaSeleccionada;
    
    return coincideBusqueda && coincideCategoria;
  });

  const limpiarForm = () => {
    setForm(formInicial);
  };

  const editarProducto = (producto) => {
    setForm({
      ...formInicial,
      ...producto
    });
    setProductoEditando(producto.id);
    setModoEdicion(true);
    setMostrarModal(true);
  };

  const crearProducto = async () => {
    try {
      await api.post("/productos", form);

      limpiarForm();
      setMostrarModal(false);
      obtenerProductos();

    } catch (error) {
      alert(error.response?.data?.error || "Error al crear producto");
    }
  };

  const actualizarProducto = async () => {
    try {
      await api.put(`/productos/${productoEditando}`, form);

      limpiarForm();
      setModoEdicion(false);
      setProductoEditando(null);
      setMostrarModal(false);
      obtenerProductos();

    } catch (error) {
      alert(error.response?.data?.error || "Error al actualizar producto");
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;

    await api.delete(`/productos/${id}`);
    obtenerProductos();
  };

  // limpia datos según tipo
  const prepararDatos = () => {
    if (form.tipo_venta === "unitario") {
      return {
        ...form,
        precio_carton: null,
        precio_medio: null
      };
    } else {
      return {
        ...form,
        precio_unitario: null
      };
    }
  };

  return (
    <div className="container">
      <h1>Productos</h1>

      <div className="top-bar">
        <button
          className="btn-agregar"
          onClick={() => {
            limpiarForm();
            setModoEdicion(false);
            setProductoEditando(null);
            setMostrarModal(true);
          }}
        >
          + Agregar producto
        </button>
        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          className="input"
        >
          <option value="">Todas las categorías</option>

          {categorias.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="buscador-container">
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            className="input-buscador"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA */}
      <div className="header-lista">
        <span>Producto</span>
        <span>Stock</span>
        <span>Precios</span>
        <span>Acciones</span>
      </div>
      <div className="lista-productos">
        {productosFiltrados.map((p) => (
          <div key={p.id} className="fila-producto">    
            <div className="info">
              <span className="nombre">{p.nombre}</span>
              <span className="codigo">{p.codigo_barra}</span>
            </div>

            {/* Stock primero */}
            <div className="stock">
              <span className="stock-label">Stock</span>
              <span className="stock-valor">{p.stock}</span>
            </div>

            {/* Precio después, más grande */}
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
              <button onClick={() => editarProducto(p)}>Editar</button>
              <button onClick={() => eliminarProducto(p.id)}>Eliminar</button>
            </div>
            
          </div>
        ))}
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar Producto" : "Nuevo Producto"}</h2>
            </div>

          <div className="modal-body">
            <div className="campo">
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
              />
            </div>

            <div className="campo">
              <label>Código de barras</label>
              <input
                value={form.codigo_barra}
                onChange={(e) => {
                  setForm({ ...form, codigo_barra: e.target.value });
                  validarCodigo(e.target.value);
                }}
              />

              {errorCodigo && <p style={{ color: "red" }}>{errorCodigo}</p>}
            </div>

            <div className="campo">
              <label>Stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
            </div>

            <div className="campo">
              <label>Categoría</label>
              <select
                value={form.categoria_id}
                onChange={(e) =>
                  setForm({ ...form, categoria_id: e.target.value })
                }
              >
                <option value="">Seleccionar categoría</option>
              
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* tipo venta */}
            <div className="campo">
              <label>Tipo de venta</label>
              <select
                value={form.tipo_venta}
                onChange={(e) =>
                  setForm({ ...form, tipo_venta: e.target.value })
                }
              >
                <option value="cigarro">Cigarro</option>
                <option value="unitario">Unitario</option>
              </select>
            </div>

            {/* dinámico */}
            {form.tipo_venta === "cigarro" ? (
              <>
                <div className="campo">
                  <label>Precio cartón</label>
                  <input
                    type="number"
                    value={form.precio_carton}
                    onChange={(e) =>
                      setForm({ ...form, precio_carton: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="campo">
                  <label>Precio medio</label>
                  <input
                    type="number"
                    value={form.precio_medio}
                    onChange={(e) =>
                      setForm({ ...form, precio_medio: Number(e.target.value) })
                    }
                  />
                </div>
              </>
            ) : (
              <div className="campo">
                <label>Precio unitario</label>
                <input
                  type="number"
                  value={form.precio_unitario}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      precio_unitario: Number(e.target.value)
                    })
                  }
                />
              </div>
            )}
            </div>
            <div className="modal-footer">
              <div className="acciones">
                <button 
                  disabled={errorCodigo}
                  onClick={modoEdicion ? actualizarProducto : crearProducto}
                >
                  {modoEdicion ? "Actualizar" : "Guardar"}
                </button>

                <button onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}