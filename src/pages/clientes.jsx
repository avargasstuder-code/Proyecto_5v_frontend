import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/clientes.css";

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

  // CLIENTES
  useEffect(() => {

    api.get("/clientes")
      .then(res => setClientes(res.data));

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
      {!diaSeleccionado && !clienteSeleccionado && (

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
                className="cliente-click"
                onClick={() => setClienteSeleccionado(c)}
              >

                <h3>{c.nombre}</h3>

                <p>{c.rut}</p>

                <p>{c.telefono}</p>

                <p className="ciudad-cliente">
                  {c.ciudad}
                </p>

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

          <h2>{clienteSeleccionado.nombre}</h2>

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

      {/* MODAL */}
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