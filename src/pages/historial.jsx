import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/historial.css";

export default function Historial() {
  const [ventas, setVentas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [mostrarBoleta, setMostrarBoleta] = useState(false);

  useEffect(() => {
    api.get("/historial")
      .then(res =>
        setVentas(
          res.data.sort(
            (a, b) => new Date(b.fecha) - new Date(a.fecha)
          )
        )
      )
      .catch(console.error);
  }, []);

  const verDetalle = async (id) => {
    try {

      const res = await api.get(`/historial/${id}`);

      setDetalle(res.data);
      setMostrarBoleta(true);

    } catch (error) {

      console.error(error);
      alert("Error");

    }
  };

    const imprimirBoleta = () => {
      const contenido = `
        <html>
            <style>
              body {
                font-family: monospace;
                width: 250px;
                padding: 10px;
              }
              h2 {
                text-align: center;
              }
              .item {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
              }
              hr {
                border: 1px dashed #000;
              }
            </style>
          <body>
            <h2>BOLETA</h2>

            <p>Cliente: ${detalle.venta.cliente}</p>
            <p>Vendedor: ${detalle.venta.usuario}</p>
            <p>Fecha: ${new Date(detalle.venta.fecha).toLocaleString()}</p>
            <p>Pago: ${detalle.venta.metodo_pago === "cheque"
                    ? `Cheque a ${detalle.venta.dias_cheque} días`
                    : detalle.venta.metodo_pago}
                </p>
            <hr/>

            ${detalle.productos.map(p => `
              <div class="item">
                <span>${p.nombre}</span>
                <span>${p.cantidad}</span>
              </div>
              <div class="item">
                <span>${p.tipo_unidad}</span>
                <span>$${p.precio_unitario * p.cantidad}</span>
              </div>
            `).join("")}

            <hr/>

            <h3>Total: $${detalle.venta.total}</h3>

            <p style="text-align:center;">Gracias por su compra</p>

            <script>
              window.print();
              window.close();
            </script>
          </body>
        </html>
      `;

      const ventana = window.open("", "", "width=300,height=600");
      ventana.document.write(contenido);
      ventana.document.close();
    };

    const enviarBoleta = async () => {
      const texto = "Prueba";

      try {
        await navigator.share({
          title: "Boleta",
          text: texto
        });
    
      } catch (err) {
        alert(err.message);
        console.error(err);
      }
    };

  return (
    <div className="container">
      <h1>Historial de Ventas</h1>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Usuario</th>
            <th>Total</th>
            <th>Pago</th>
            <th>Detalle</th>
          </tr>
        </thead>

        <tbody>
          {ventas.map(v => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.cliente}</td>
              <td>{v.usuario}</td>
              <td>${v.total}</td>
              <td>
                 {v.metodo_pago === "cheque"
                   ? `Cheque (${v.dias_cheque} días)`
                   : v.metodo_pago}
                </td>
              <td>
                <button onClick={() => verDetalle(v.id)}>
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {mostrarBoleta && detalle && (
        <div className="modal">
            <div className="boleta">

              <h2>Boleta</h2>

              <p><b>Cliente:</b> {detalle.venta.cliente}</p>
              <p><b>Vendedor:</b> {detalle.venta.usuario}</p>
              <p><b>Fecha:</b> {new Date(detalle.venta.fecha).toLocaleString()}</p>
              <p><b>Pago:</b> 
                  {detalle.venta.metodo_pago === "cheque"
                    ? `Cheque a ${detalle.venta.dias_cheque} días`
                    : detalle.venta.metodo_pago}
                </p>

              <hr />

              {detalle.productos.map((p, i) => (
                <div key={i} className="boleta-item">
                  <strong>{p.nombre}</strong>
                  <span>Tipo: {p.tipo_unidad}</span>
                  <span>Cantidad: {p.cantidad}</span>
                  <span>Subtotal: ${p.precio_unitario * p.cantidad}</span>
                </div>
                ))}

              <hr />
          
              <h3>Total: ${detalle.venta.total}</h3>
          
              <div className="acciones-boleta">
                  <button className="btn-cerrar" onClick={() => setMostrarBoleta(false)}>
                    Cerrar
                  </button>
                  <button className="btn-imprimir" onClick={enviarBoleta}>
                    Enviar
                  </button>
                </div>
            </div>
          </div>
        )}
    </div>
  )};
