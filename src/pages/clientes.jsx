import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/clientes.css";

const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

export default function Clientes() {


  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [frecuentes, setFrecuentes] = useState([]);
  const [stockCliente, setStockCliente] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);

  const [ultimosStocks, setUltimosStocks] = useState([]);

  const [seleccionados, setSeleccionados] = useState([]);

  const [detalleVenta, setDetalleVenta] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // NUEVO CLIENTE
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [ciudades, setCiudades] = useState([]);
  const [diasVisita, setDiasVisita] = useState([]);
  const formClienteInicial = {
    nombre: "",
    apellido: "",
    rut: "",
    direccion: "",
    telefono: "",
    ciudad_id: "",
    dia_id: ""
  };
  const [nuevoCliente, setNuevoCliente] = useState(formClienteInicial);

  // LISTADO DE CLIENTES
  const [mostrarListado, setMostrarListado] = useState(false);
  const [clientesTodos, setClientesTodos] = useState([]);
  const [busquedaListado, setBusquedaListado] = useState("");

  // EDITAR CLIENTE
  const [mostrarEditarCliente, setMostrarEditarCliente] = useState(false);
  const [clienteEditar, setClienteEditar] = useState(null);

  // CLIENTES
  useEffect(() => {

    api.get("/clientes")
      .then(res => setClientes(res.data));

  }, []);

  // CIUDADES Y DÍAS (para los formularios)
  useEffect(() => {

    api.get("/ciudades")
      .then(res => setCiudades(res.data));

    api.get("/clientes/dias")
      .then(res => setDiasVisita(res.data));

  }, []);

  // DATOS CLIENTE
  useEffect(() => {

    if (!clienteSeleccionado) return;

    api.get(`/clientes/frecuentes/${clienteSeleccionado.id}`)
      .then(res => setFrecuentes(res.data));

    api.get(`/clientes/stock/${clienteSeleccionado.id}`)
      .then(res => setStockCliente(res.data));

    api.get(`/clientes/ultimas-ventas/${clienteSeleccionado.id}`)
      .then(res => setUltimasVentas(res.data));

    api.get(`/clientes/ultimos-stocks/${clienteSeleccionado.id}`)
      .then(res => setUltimosStocks(res.data));

    setSeleccionados([]);

  }, [clienteSeleccionado]);

  const diasUnicos = [...new Set(clientes.map(c => c.dia))];

  const clientesFiltrados = diaSeleccionado
    ? clientes.filter(c => c.dia === diaSeleccionado)
    : [];

  // FILTRO DEL LISTADO COMPLETO (por nombre, apellido o RUT)
  const clientesListadoFiltrados = clientesTodos.filter(c => {
    const termino = busquedaListado.toLowerCase().trim();
    if (!termino) return true;

    const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
    const rutLimpio = (c.rut || "").toLowerCase().replace(/\./g, "").replace("-", "");
    const terminoLimpio = termino.replace(/\./g, "").replace("-", "");

    return nombreCompleto.includes(termino) || rutLimpio.includes(terminoLimpio);
  });

  // VALIDAR RUT CHILENO
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

  // CREAR CLIENTE
  const crearCliente = async () => {

    if (!nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.rut || !nuevoCliente.ciudad_id || !nuevoCliente.dia_id) {
      return alert("Nombre, apellido, RUT, ciudad y día son obligatorios");
    }

    if (!validarRUT(nuevoCliente.rut)) {
      return alert("RUT inválido");
    }

    try {

      await api.post("/clientes", nuevoCliente);

      const res = await api.get("/clientes");
      setClientes(res.data);

      setNuevoCliente(formClienteInicial);
      setMostrarNuevoCliente(false);

      alert("Cliente creado");

    } catch (error) {

      console.error(error);
      alert(error.response?.data?.error || "Error al crear cliente");

    }
  };

  // CARGAR LISTADO COMPLETO
  const cargarListado = async () => {
    try {
      const res = await api.get("/clientes/todos");
      setClientesTodos(res.data);
      setBusquedaListado("");
      setMostrarListado(true);
    } catch (error) {
      console.error(error);
      alert("Error al cargar el listado de clientes");
    }
  };

  // ABRIR EDICIÓN
  const abrirEditar = (cliente) => {
    setClienteEditar({
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      rut: cliente.rut,
      direccion: cliente.direccion || "",
      telefono: cliente.telefono || "",
      ciudad_id: cliente.ciudad_id || "",
      dia_id: cliente.dia_id || ""
    });
    setMostrarEditarCliente(true);
  };

  // GUARDAR EDICIÓN
  const actualizarCliente = async () => {

    if (!clienteEditar.nombre || !clienteEditar.apellido || !clienteEditar.rut || !clienteEditar.ciudad_id || !clienteEditar.dia_id) {
      return alert("Nombre, apellido, RUT, ciudad y día son obligatorios");
    }

    if (!validarRUT(clienteEditar.rut)) {
      return alert("RUT inválido");
    }

    try {

      await api.put(`/clientes/${clienteEditar.id}`, clienteEditar);

      const [resTodos, resClientes] = await Promise.all([
        api.get("/clientes/todos"),
        api.get("/clientes")
      ]);

      setClientesTodos(resTodos.data);
      setClientes(resClientes.data);

      setMostrarEditarCliente(false);
      setClienteEditar(null);

      alert("Cliente actualizado");

    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al actualizar cliente");
    }
  };

  // ACTIVAR / DESACTIVAR
  const toggleActivo = async (cliente) => {

    const accion = cliente.activo ? "desactivar" : "activar";

    if (!confirm(`¿Seguro que quieres ${accion} a ${cliente.nombre} ${cliente.apellido}?`)) return;

    try {

      await api.put(`/clientes/${cliente.id}/activo`, { activo: !cliente.activo });

      const [resTodos, resClientes] = await Promise.all([
        api.get("/clientes/todos"),
        api.get("/clientes")
      ]);

      setClientesTodos(resTodos.data);
      setClientes(resClientes.data);

    } catch (error) {
      console.error(error);
      alert("Error al cambiar el estado del cliente");
    }
  };

  // DETALLE VENTA
  const verDetalleVenta = async (ventaId) => {

    try {

      const res = await api.get(`/historial/${ventaId}`);
      const data = res.data;

      setDetalleVenta(data);
      setMostrarDetalle(true);

    } catch (error) {

      console.error(error);
      alert("Error");

    }
  };

  // GUARDAR STOCK
  const guardarStock = async (producto) => {

    if (producto.vendido < 0) {
      alert("Stock inválido");
      return;
    }

    try {

      await api.post("/clientes/stock-actual", {
        cliente_id: clienteSeleccionado.id,
        producto_id: producto.id,
        stock_actual: producto.vendido
      });

      // actualizar stock local
      setStockCliente(prev =>
        prev.map(x =>
          x.id === producto.id
            ? {
                ...x,
                stock: producto.vendido,
                vendido: ""
              }
            : x
        )
      );

      // recargar historial
      api.get(`/clientes/ultimos-stocks/${clienteSeleccionado.id}`)
        .then(res => setUltimosStocks(res.data));

      alert("Stock actualizado");

    } catch (error) {

      console.error(error);
      alert("Error");

    }
  };

  return (
    <div className="container">

      <h1>Clientes</h1>

      {/* VISTA 1 */}
      {!diaSeleccionado && !clienteSeleccionado && !mostrarListado && (

        <>

          <div className="acciones-clientes">
            <button
              className="btn-agregar"
              onClick={() => {
                setNuevoCliente(formClienteInicial);
                setMostrarNuevoCliente(true);
              }}
            >
              + Agregar cliente
            </button>

            <button
              className="btn-agregar btn-secundario-clientes"
              onClick={cargarListado}
            >
              Listado de clientes
            </button>
          </div>

          <div className="grid-ciudades">

            {diasUnicos.map(dia => (

              <div
                key={dia}
                className="card-ciudad"
                onClick={() => setDiaSeleccionado(dia)}
              >
                <h3>{dia}</h3>

                <p>
                  {
                    clientes.filter(c => c.dia === dia).length
                  } clientes
                </p>

              </div>

            ))}

          </div>

        </>
      )}

      {/* LISTADO COMPLETO DE CLIENTES */}
      {mostrarListado && (
        <>

          <button
            className="btn-volver"
            onClick={() => setMostrarListado(false)}
          >
            ← Volver
          </button>

          <h2>Listado de clientes</h2>

          <input
            type="text"
            placeholder="🔍 Buscar por nombre o RUT..."
            className="input-buscador"
            value={busquedaListado}
            onChange={(e) => setBusquedaListado(e.target.value)}
          />

          <div className="listado-clientes">

            {clientesListadoFiltrados.length === 0 && (
              <p>No se encontraron clientes.</p>
            )}

            {clientesListadoFiltrados.map(c => (

              <div key={c.id} className="fila-cliente-listado">

                <div className="info-cliente-listado">
                  <strong>{c.nombre} {c.apellido}</strong>
                  <span>{c.rut}</span>
                  <span>{c.telefono}</span>
                  <span>{c.direccion}</span>
                  <span>{c.ciudad} · {c.dia}</span>
                  {c.vendedor && <span>Vendedor: {c.vendedor}</span>}
                  <span className={c.activo ? "estado-activo" : "estado-inactivo"}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="acciones-cliente-listado">
                  <button onClick={() => abrirEditar(c)}>Editar</button>
                  <button
                    className={c.activo ? "btn-desactivar" : "btn-activar"}
                    onClick={() => toggleActivo(c)}
                  >
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>

              </div>

            ))}

          </div>

        </>
      )}

      {/* VISTA 2 */}
      {diaSeleccionado && !clienteSeleccionado && (
        <>

          <button
            className="btn-volver"
            onClick={() => setDiaSeleccionado(null)}
          >
            ← Volver
          </button>

          <h2>{diaSeleccionado}</h2>

          <div className="grid-clientes">

            {clientesFiltrados.map(c => (

              <div
                key={c.id}
                className={`cliente-click ${c.deuda_pendiente > 0 ? "cliente-con-deuda" : ""}`}
                onClick={() => setClienteSeleccionado(c)}
              >

                <h3>{c.nombre} {c.apellido}</h3>

                <p>{c.rut}</p>

                <p>{c.telefono}</p>

                <p className="ciudad-cliente">
                  {c.ciudad}
                </p>

                {c.deuda_pendiente > 0 && (
                  <p className="aviso-deuda-tarjeta">
                    ⚠️ Debe ${formatoCLP(c.deuda_pendiente)}
                  </p>
                )}

              </div>

            ))}

          </div>

        </>
      )}

      {/* VISTA 3 */}
      {clienteSeleccionado && (
        <>

          <button
            className="btn-volver"
            onClick={() => setClienteSeleccionado(null)}
          >
            ← Volver
          </button>

          <h2>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</h2>

          {clienteSeleccionado.deuda_pendiente > 0 && (
            <p className="aviso-deuda-tarjeta aviso-deuda-detalle">
              ⚠️ Este cliente debe ${formatoCLP(clienteSeleccionado.deuda_pendiente)}
            </p>
          )}

          {/* PRODUCTOS FRECUENTES */}
          <div className="panel">

            <h3>Productos frecuentes</h3>

            {frecuentes.length === 0 && (
              <p>No hay datos</p>
            )}

            {frecuentes.map(p => {

              const seleccionado =
                seleccionados.find(x => x.id === p.id);

              return (

                <div key={p.id} className="producto-frecuente">

                  <div className="item item-frecuente">
                    <div className="producto-izquierda">
                
                      <input
                        type="checkbox"
                        checked={!!seleccionado}
                        onChange={(e) => {
                        
                          if (e.target.checked) {
                          
                            setSeleccionados(prev => [
                              ...prev,
                              {
                                id: p.id,
                                nombre: p.nombre,
                                cantidad: p.cantidad_frecuente,
                                tipo: "carton"
                              }
                            ]);
                          
                          } else {
                          
                            setSeleccionados(prev =>
                              prev.filter(x => x.id !== p.id)
                            );
                          
                          }
                        }}
                      /> 
                    </div>
                    <span>
                      {p.nombre}
                    </span>
                      
                    <span>
                      x{p.cantidad_frecuente}
                    </span>
                      
                  </div>

                </div>
              );
            })}

            <button
              className="btn-vender"
              disabled={seleccionados.length === 0}
              onClick={() => {

                localStorage.setItem(
                  "clienteVenta",
                  JSON.stringify(clienteSeleccionado)
                );

                localStorage.setItem(
                  "carritoRapido",
                  JSON.stringify(seleccionados)
                );

                window.location.href = "/ventas";
              }}
            >
              Vender seleccionados ({seleccionados.length})
            </button>

          </div>

          {/* STOCK */}
          <div className="panel">

            <h3>Stock del cliente</h3>

            {stockCliente.map(p => (

              <div key={p.id} className="item stock-item">

                <span>{p.nombre}</span>

                <span>
                  Stock: {p.stock}
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Stock actual"
                  value={p.vendido ?? ""}
                  onChange={(e) => {

                    const valor = Number(e.target.value);

                    setStockCliente(prev =>
                      prev.map(x =>
                        x.id === p.id
                          ? {
                              ...x,
                              vendido: valor
                            }
                          : x
                      )
                    );
                  }}
                />

                <button
                  className="btn-guardar-stock"
                  onClick={() => guardarStock(p)}
                >
                  Guardar
                </button>

              </div>

            ))}

          </div>

          {/* VENTAS */}
          <div className="panel">

            <h3>Últimas ventas</h3>

            {ultimasVentas.map(v => (

              <div key={v.id} className="item">

                <span>
                  {new Date(v.fecha).toLocaleDateString()}
                </span>

                <span>${v.total}</span>

                <button
                  onClick={() => verDetalleVenta(v.id)}
                >
                  Ver detalle
                </button>

              </div>

            ))}

          </div>

          <button
            className="btn-vender"
            onClick={() => {

              localStorage.setItem(
                "clienteVenta",
                JSON.stringify(clienteSeleccionado)
              );

              window.location.href = "/ventas";

            }}
          >
            Nueva venta
          </button>

        </>
      )}

      {/* MODAL NUEVO CLIENTE */}
      {mostrarNuevoCliente && (

        <div className="modal">

          <div className="modal-content">

            <h2>Nuevo Cliente</h2>

            <input
              placeholder="Nombre"
              value={nuevoCliente.nombre}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
              }
            />

            <input
              placeholder="Apellido"
              value={nuevoCliente.apellido}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })
              }
            />

            <input
              placeholder="RUT"
              value={nuevoCliente.rut}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, rut: e.target.value })
              }
            />

            <input
              placeholder="Dirección"
              value={nuevoCliente.direccion}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })
              }
            />

            <input
              placeholder="Teléfono"
              value={nuevoCliente.telefono}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
              }
            />

            <select
              className="input"
              value={nuevoCliente.ciudad_id}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, ciudad_id: e.target.value })
              }
            >
              <option value="">Seleccionar ciudad</option>
              {ciudades.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={nuevoCliente.dia_id}
              onChange={(e) =>
                setNuevoCliente({ ...nuevoCliente, dia_id: e.target.value })
              }
            >
              <option value="">Seleccionar día de visita</option>
              {diasVisita.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>

            <div className="acciones">
              <button onClick={crearCliente}>Guardar</button>
              <button onClick={() => setMostrarNuevoCliente(false)}>
                Cancelar
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL EDITAR CLIENTE */}
      {mostrarEditarCliente && clienteEditar && (

        <div className="modal">

          <div className="modal-content">

            <h2>Editar Cliente</h2>

            <input
              placeholder="Nombre"
              value={clienteEditar.nombre}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, nombre: e.target.value })
              }
            />

            <input
              placeholder="Apellido"
              value={clienteEditar.apellido}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, apellido: e.target.value })
              }
            />

            <input
              placeholder="RUT"
              value={clienteEditar.rut}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, rut: e.target.value })
              }
            />

            <input
              placeholder="Dirección"
              value={clienteEditar.direccion}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, direccion: e.target.value })
              }
            />

            <input
              placeholder="Teléfono"
              value={clienteEditar.telefono}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, telefono: e.target.value })
              }
            />

            <select
              className="input"
              value={clienteEditar.ciudad_id}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, ciudad_id: e.target.value })
              }
            >
              <option value="">Seleccionar ciudad</option>
              {ciudades.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={clienteEditar.dia_id}
              onChange={(e) =>
                setClienteEditar({ ...clienteEditar, dia_id: e.target.value })
              }
            >
              <option value="">Seleccionar día de visita</option>
              {diasVisita.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>

            <div className="acciones">
              <button onClick={actualizarCliente}>Guardar</button>
              <button
                onClick={() => {
                  setMostrarEditarCliente(false);
                  setClienteEditar(null);
                }}
              >
                Cancelar
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL DETALLE VENTA */}
      {mostrarDetalle &&
        detalleVenta?.venta &&
        detalleVenta?.productos && (

        <div className="modal">

          <div className="boleta">

            <h2>Detalle de venta</h2>

            <p>
              <b>Cliente:</b>
              {" "}
              {detalleVenta.venta.cliente}
            </p>

            <p>
              <b>Rut:</b>
              {" "}
              {detalleVenta.venta.rut}
            </p>

            <p>
              <b>Fecha:</b>
              {" "}
              {new Date(
                detalleVenta.venta.fecha
              ).toLocaleString()}
            </p>

            <p>
              <b>Pago:</b>
              {" "}
              {detalleVenta.venta.metodo_pago}
            </p>

            <hr />

            {detalleVenta.productos.map((p, i) => (

              <div key={i} className="boleta-item">

                <span>{p.nombre}</span>

                <span>{p.tipo_unidad}</span>

                <span>x{p.cantidad}</span>

                <span>
                  $
                  {p.precio_unitario * p.cantidad}
                </span>

              </div>

            ))}

            <hr />

            <h3>
              Total:
              {" "}
              ${detalleVenta.venta.total}
            </h3>

            <button
              onClick={() => setMostrarDetalle(false)}
            >
              Cerrar
            </button>

          </div>

        </div>
      )}

    </div>
  );
}