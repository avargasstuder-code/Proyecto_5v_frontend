import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/clientes.css";

const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

export default function Clientes() {

  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);

  const [frecuentes, setFrecuentes] = useState([]);
  const [stockSucursal, setStockSucursal] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);

  const [ultimosStocks, setUltimosStocks] = useState([]);

  const [seleccionados, setSeleccionados] = useState([]);

  const [detalleVenta, setDetalleVenta] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // NUEVA SUCURSAL (crea el cliente también, si el RUT es nuevo)
  const [mostrarNuevaSucursal, setMostrarNuevaSucursal] = useState(false);
  const [ciudades, setCiudades] = useState([]);
  const [diasVisita, setDiasVisita] = useState([]);
  const formSucursalInicial = {
    nombre: "",
    apellido: "",
    rut: "",
    direccion: "",
    telefono: "",
    ciudad_id: "",
    dia_id: ""
  };
  const [nuevaSucursal, setNuevaSucursal] = useState(formSucursalInicial);

  // LISTADO COMPLETO
  const [mostrarListado, setMostrarListado] = useState(false);
  const [sucursalesTodas, setSucursalesTodas] = useState([]);
  const [busquedaListado, setBusquedaListado] = useState("");

  // EDITAR SUCURSAL
  const [mostrarEditarSucursal, setMostrarEditarSucursal] = useState(false);
  const [sucursalEditar, setSucursalEditar] = useState(null);

  // SUCURSALES (vista por día)
  useEffect(() => {

    api.get("/sucursales")
      .then(res => setSucursales(res.data));

  }, []);

  // CIUDADES Y DÍAS (para los formularios)
  useEffect(() => {

    api.get("/ciudades")
      .then(res => setCiudades(res.data));

    api.get("/sucursales/dias")
      .then(res => setDiasVisita(res.data));

  }, []);

  // DATOS DE LA SUCURSAL SELECCIONADA
  useEffect(() => {

    if (!sucursalSeleccionada) return;

    api.get(`/sucursales/frecuentes/${sucursalSeleccionada.id}`)
      .then(res => setFrecuentes(res.data));

    api.get(`/sucursales/stock/${sucursalSeleccionada.id}`)
      .then(res => setStockSucursal(res.data));

    api.get(`/sucursales/ultimas-ventas/${sucursalSeleccionada.id}`)
      .then(res => setUltimasVentas(res.data));

    api.get(`/sucursales/ultimos-stocks/${sucursalSeleccionada.id}`)
      .then(res => setUltimosStocks(res.data));

    setSeleccionados([]);

  }, [sucursalSeleccionada]);

  const diasUnicos = [...new Set(sucursales.map(s => s.dia))];

  const sucursalesFiltradas = diaSeleccionado
    ? sucursales.filter(s => s.dia === diaSeleccionado)
    : [];

  // FILTRO DEL LISTADO COMPLETO (por nombre, apellido, RUT o dirección)
  const sucursalesListadoFiltradas = sucursalesTodas.filter(s => {
    const termino = busquedaListado.toLowerCase().trim();
    if (!termino) return true;

    const nombreCompleto = `${s.nombre} ${s.apellido}`.toLowerCase();
    const rutLimpio = (s.rut || "").toLowerCase().replace(/\./g, "").replace("-", "");
    const terminoLimpio = termino.replace(/\./g, "").replace("-", "");
    const direccion = (s.direccion || "").toLowerCase();

    return (
      nombreCompleto.includes(termino) ||
      (rutLimpio && rutLimpio.includes(terminoLimpio)) ||
      direccion.includes(termino)
    );
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

  // VALIDAR TELÉFONO (9 + 8 dígitos, ej: 912345678). Vacío se permite,
  // ya que el teléfono no es obligatorio.
  const validarTelefono = (telefono) => {
    if (!telefono || !telefono.trim()) return true;
    const limpio = telefono.replace(/[\s-]/g, "");
    return /^9\d{8}$/.test(limpio);
  };

  // CREAR SUCURSAL (y el cliente, si el RUT es nuevo)
  const crearSucursal = async () => {

    if (!nuevaSucursal.nombre || !nuevaSucursal.apellido || !nuevaSucursal.rut || !nuevaSucursal.ciudad_id || !nuevaSucursal.dia_id || !nuevaSucursal.direccion) {
      return alert("Nombre, apellido, RUT, dirección, ciudad y día son obligatorios");
    }

    if (!validarRUT(nuevaSucursal.rut)) {
      return alert("RUT inválido");
    }

    if (!validarTelefono(nuevaSucursal.telefono)) {
      return alert("Teléfono inválido. Formato esperado: 912345678 (9 dígitos, empieza con 9)");
    }

    try {

      const res = await api.post("/sucursales", nuevaSucursal);

      const resSucursales = await api.get("/sucursales");
      setSucursales(resSucursales.data);

      setNuevaSucursal(formSucursalInicial);
      setMostrarNuevaSucursal(false);

      alert(
        res.data.clienteExistente
          ? "Sucursal agregada a un cliente que ya tenías"
          : "Cliente y sucursal creados"
      );

    } catch (error) {

      console.error(error);
      alert(error.response?.data?.error || "Error al crear la sucursal");

    }
  };

  // CARGAR LISTADO COMPLETO
  const cargarListado = async () => {
    try {
      const res = await api.get("/sucursales/todos");
      setSucursalesTodas(res.data);
      setBusquedaListado("");
      setMostrarListado(true);
    } catch (error) {
      console.error(error);
      alert("Error al cargar el listado de sucursales");
    }
  };

  // ABRIR EDICIÓN
  const abrirEditar = (sucursal) => {
    setSucursalEditar({
      id: sucursal.id,
      nombre: sucursal.nombre,
      apellido: sucursal.apellido,
      rut: sucursal.rut,
      direccion: sucursal.direccion || "",
      telefono: sucursal.telefono || "",
      ciudad_id: sucursal.ciudad_id || "",
      dia_id: sucursal.dia_id || ""
    });
    setMostrarEditarSucursal(true);
  };

  // GUARDAR EDICIÓN
  const actualizarSucursal = async () => {

    if (!sucursalEditar.nombre || !sucursalEditar.apellido || !sucursalEditar.rut || !sucursalEditar.ciudad_id || !sucursalEditar.dia_id || !sucursalEditar.direccion) {
      return alert("Nombre, apellido, RUT, dirección, ciudad y día son obligatorios");
    }

    if (!validarRUT(sucursalEditar.rut)) {
      return alert("RUT inválido");
    }

    if (!validarTelefono(sucursalEditar.telefono)) {
      return alert("Teléfono inválido. Formato esperado: 912345678 (9 dígitos, empieza con 9)");
    }

    try {

      await api.put(`/sucursales/${sucursalEditar.id}`, sucursalEditar);

      const [resTodas, resSucursales] = await Promise.all([
        api.get("/sucursales/todos"),
        api.get("/sucursales")
      ]);

      setSucursalesTodas(resTodas.data);
      setSucursales(resSucursales.data);

      setMostrarEditarSucursal(false);
      setSucursalEditar(null);

      alert("Sucursal actualizada");

    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Error al actualizar la sucursal");
    }
  };

  // ACTIVAR / DESACTIVAR
  const toggleActivo = async (sucursal) => {

    const accion = sucursal.activo ? "desactivar" : "activar";

    if (!confirm(`¿Seguro que quieres ${accion} la sucursal de ${sucursal.nombre} ${sucursal.apellido} en ${sucursal.direccion}?`)) return;

    try {

      await api.put(`/sucursales/${sucursal.id}/activo`, { activo: !sucursal.activo });

      const [resTodas, resSucursales] = await Promise.all([
        api.get("/sucursales/todos"),
        api.get("/sucursales")
      ]);

      setSucursalesTodas(resTodas.data);
      setSucursales(resSucursales.data);

    } catch (error) {
      console.error(error);
      alert("Error al cambiar el estado de la sucursal");
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

      await api.post("/sucursales/stock-actual", {
        sucursal_id: sucursalSeleccionada.id,
        producto_id: producto.id,
        stock_actual: producto.vendido
      });

      // actualizar stock local
      setStockSucursal(prev =>
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
      api.get(`/sucursales/ultimos-stocks/${sucursalSeleccionada.id}`)
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
      {!diaSeleccionado && !sucursalSeleccionada && !mostrarListado && (

        <>

          <div className="acciones-clientes">
            <button
              className="btn-agregar"
              onClick={() => {
                setNuevaSucursal(formSucursalInicial);
                setMostrarNuevaSucursal(true);
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
                    sucursales.filter(s => s.dia === dia).length
                  } clientes
                </p>

              </div>

            ))}

          </div>

        </>
      )}

      {/* LISTADO COMPLETO */}
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
            placeholder="🔍 Buscar por nombre, RUT o dirección..."
            className="input-buscador"
            value={busquedaListado}
            onChange={(e) => setBusquedaListado(e.target.value)}
          />

          <div className="listado-clientes">

            {sucursalesListadoFiltradas.length === 0 && (
              <p>No se encontraron clientes.</p>
            )}

            {sucursalesListadoFiltradas.map(s => (

              <div key={s.id} className="fila-cliente-listado">

                <div className="info-cliente-listado">
                  <strong>{s.nombre} {s.apellido}</strong>
                  <span>{s.rut}</span>
                  <span>{s.telefono || "Sin teléfono"}</span>
                  <span>{s.direccion}</span>
                  <span>{s.ciudad} · {s.dia}</span>
                  {s.vendedor && <span>Vendedor: {s.vendedor}</span>}
                  <span className={s.activo ? "estado-activo" : "estado-inactivo"}>
                    {s.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="acciones-cliente-listado">
                  <button onClick={() => abrirEditar(s)}>Editar</button>
                  <button
                    className={s.activo ? "btn-desactivar" : "btn-activar"}
                    onClick={() => toggleActivo(s)}
                  >
                    {s.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>

              </div>

            ))}

          </div>

        </>
      )}

      {/* VISTA 2 */}
      {diaSeleccionado && !sucursalSeleccionada && (
        <>

          <button
            className="btn-volver"
            onClick={() => setDiaSeleccionado(null)}
          >
            ← Volver
          </button>

          <h2>{diaSeleccionado}</h2>

          <div className="grid-clientes">

            {sucursalesFiltradas.map(s => (

              <div
                key={s.id}
                className={`cliente-click ${s.deuda_pendiente > 0 ? "cliente-con-deuda" : ""}`}
                onClick={() => setSucursalSeleccionada(s)}
              >

                <h3>{s.nombre} {s.apellido}</h3>

                <p>{s.rut}</p>

                <p className="direccion-cliente">{s.direccion}</p>

                <p>{s.telefono || "Sin teléfono"}</p>

                {s.deuda_pendiente > 0 && (
                  <p className="aviso-deuda-tarjeta">
                    ⚠️ Debe ${formatoCLP(s.deuda_pendiente)}
                  </p>
                )}

              </div>

            ))}

          </div>

        </>
      )}

      {/* VISTA 3 */}
      {sucursalSeleccionada && (
        <>

          <button
            className="btn-volver"
            onClick={() => setSucursalSeleccionada(null)}
          >
            ← Volver
          </button>

          <h2>{sucursalSeleccionada.nombre} {sucursalSeleccionada.apellido}</h2>
          <p className="direccion-cliente">{sucursalSeleccionada.direccion}</p>

          {sucursalSeleccionada.deuda_pendiente > 0 && (
            <p className="aviso-deuda-tarjeta aviso-deuda-detalle">
              ⚠️ Esta sucursal debe ${formatoCLP(sucursalSeleccionada.deuda_pendiente)}
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
                  "sucursalVenta",
                  JSON.stringify(sucursalSeleccionada)
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

            <h3>Stock de la sucursal</h3>

            {stockSucursal.map(p => (

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

                    setStockSucursal(prev =>
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
                "sucursalVenta",
                JSON.stringify(sucursalSeleccionada)
              );

              window.location.href = "/ventas";

            }}
          >
            Nueva venta
          </button>

        </>
      )}

      {/* MODAL NUEVA SUCURSAL */}
      {mostrarNuevaSucursal && (

        <div className="modal">

          <div className="modal-content">

            <h2>Nuevo Cliente</h2>
            <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>
              Si el RUT ya existe, esto se agrega como una sucursal nueva de ese cliente.
            </p>

            <input
              placeholder="Nombre"
              value={nuevaSucursal.nombre}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, nombre: e.target.value })
              }
            />

            <input
              placeholder="Apellido"
              value={nuevaSucursal.apellido}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, apellido: e.target.value })
              }
            />

            <input
              placeholder="RUT"
              value={nuevaSucursal.rut}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, rut: e.target.value })
              }
            />

            <input
              placeholder="Dirección"
              value={nuevaSucursal.direccion}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, direccion: e.target.value })
              }
            />

            <input
              placeholder="Teléfono"
              value={nuevaSucursal.telefono}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, telefono: e.target.value })
              }
            />

            <select
              className="input"
              value={nuevaSucursal.ciudad_id}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, ciudad_id: e.target.value })
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
              value={nuevaSucursal.dia_id}
              onChange={(e) =>
                setNuevaSucursal({ ...nuevaSucursal, dia_id: e.target.value })
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
              <button onClick={crearSucursal}>Guardar</button>
              <button onClick={() => setMostrarNuevaSucursal(false)}>
                Cancelar
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL EDITAR SUCURSAL */}
      {mostrarEditarSucursal && sucursalEditar && (

        <div className="modal">

          <div className="modal-content">

            <h2>Editar Cliente</h2>
            <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>
              El nombre, apellido y RUT se aplican a todas las sucursales de este cliente.
            </p>

            <input
              placeholder="Nombre"
              value={sucursalEditar.nombre}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, nombre: e.target.value })
              }
            />

            <input
              placeholder="Apellido"
              value={sucursalEditar.apellido}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, apellido: e.target.value })
              }
            />

            <input
              placeholder="RUT"
              value={sucursalEditar.rut}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, rut: e.target.value })
              }
            />

            <input
              placeholder="Dirección"
              value={sucursalEditar.direccion}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, direccion: e.target.value })
              }
            />

            <input
              placeholder="Teléfono"
              value={sucursalEditar.telefono}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, telefono: e.target.value })
              }
            />

            <select
              className="input"
              value={sucursalEditar.ciudad_id}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, ciudad_id: e.target.value })
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
              value={sucursalEditar.dia_id}
              onChange={(e) =>
                setSucursalEditar({ ...sucursalEditar, dia_id: e.target.value })
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
              <button onClick={actualizarSucursal}>Guardar</button>
              <button
                onClick={() => {
                  setMostrarEditarSucursal(false);
                  setSucursalEditar(null);
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

            {detalleVenta.venta.direccion && (
              <p>
                <b>Dirección:</b>
                {" "}
                {detalleVenta.venta.direccion}
              </p>
            )}

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