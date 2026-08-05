import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/historial.css";

// Formatea números como pesos chilenos: sin decimales, con punto de miles (ej: 10.000)
const formatoCLP = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return numero.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

// Formatea un RUT chileno a formato con puntos y guión (ej: 12.345.678-9)
const formatoRUT = (rut) => {
  if (!rut) return "";

  const limpio = rut.replace(/\./g, "").replace(/-/g, "").trim();
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();

  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${cuerpoConPuntos}-${dv}`;
};

// Muestra el método de pago, o "Pendiente" si aún no se ha definido
const formatoPago = (venta) => {
  if (!venta.metodo_pago) return "Pendiente";

  if (venta.metodo_pago === "cheque") {
    return `Cheque a ${venta.dias_cheque} días`;
  }

  return venta.metodo_pago.charAt(0).toUpperCase() + venta.metodo_pago.slice(1);
};

// Fuerza el formato día-mes-año, sin depender de la configuración regional del dispositivo
const formatoFecha = (fecha) => {
  return new Date(fecha).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function Historial() {
  const [ventas, setVentas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [mostrarBoleta, setMostrarBoleta] = useState(false);
  const [mostrarSelectorFormato, setMostrarSelectorFormato] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [busqueda, setBusqueda] = useState("");


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

  // FILTRO: por nombre de cliente, RUT o fecha
  const ventasFiltradas = ventas.filter(v => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;

    const nombre = (v.cliente || "").toLowerCase();

    const rutLimpio = (v.rut || "").toLowerCase().replace(/\./g, "").replace(/-/g, "");
    const terminoLimpio = termino.replace(/\./g, "").replace(/-/g, "");

    const fechaCorta = new Date(v.fecha).toLocaleDateString("es-CL"); // ej: 20-07-2026
    const fechaISO = v.fecha.slice(0, 10); // ej: 2026-07-20

    return (
      nombre.includes(termino) ||
      (rutLimpio && rutLimpio.includes(terminoLimpio)) ||
      fechaCorta.includes(termino) ||
      fechaISO.includes(termino)
    );
  });


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

    // Escapa caracteres especiales de HTML antes de insertarlos en el
    // documento de impresión (evita que un nombre con < > & etc. rompa
    // el HTML o, en el peor caso, ejecute código dentro de esa ventana)
    const escaparHtml = (valor) => {
      if (valor === null || valor === undefined) return "";
      return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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
            <h2>Guía de venta</h2>

            <p>Cliente: ${escaparHtml(detalle.venta.cliente)}</p>
            <p>Rut: ${escaparHtml(formatoRUT(detalle.venta.rut))}</p>
            <p>Ciudad: ${escaparHtml(detalle.venta.ciudad || "")}</p>
            <p>Vendedor: ${escaparHtml(detalle.venta.usuario)}</p>
            <p>Fecha: ${escaparHtml(formatoFecha(detalle.venta.fecha))}</p>
            <hr/>

            ${detalle.productos.map(p => `
              <div class="item">
                <span>${escaparHtml(p.nombre)}</span>
                <span>${escaparHtml(p.tipo_unidad)}</span>
                <span>x${escaparHtml(p.cantidad)}</span>
                <span>$${formatoCLP(p.precio_unitario * p.cantidad)}</span>
              </div>
            `).join("")}

            <hr/>

            <h3>Total: $${formatoCLP(detalle.venta.total)}</h3>

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

  // Pide el PDF ya armado al backend (se genera en el servidor con
  // pdfkit, así que siempre sale completo sin importar el celular)
  const descargarBoleta = async (formato) => {
    setMostrarSelectorFormato(false);
    setGenerandoPdf(true);

    try {
      const res = await api.get(`/historial/${detalle.venta.id}/pdf`, {
        params: { formato },
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `guia-venta-${detalle.venta.id}-${formato}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      alert("Error al generar el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="container">
      <h1>Historial de Ventas</h1>

      <input
        type="text"
        placeholder="🔍 Buscar por nombre, RUT o fecha (dd-mm-aaaa)..."
        className="input-buscador"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

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
          {ventasFiltradas.map(v => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.cliente}</td>
              <td>{v.usuario}</td>
              <td>${formatoCLP(v.total)}</td>
              <td>{formatoPago(v)}</td>
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

              <h2>Guía de venta</h2>

              <p><b>Cliente:</b> {detalle.venta.cliente}</p>
              <p><b>Rut:</b> {formatoRUT(detalle.venta.rut)}</p>
              <p><b>Ciudad:</b> {detalle.venta.ciudad}</p>
              <p><b>Vendedor:</b> {detalle.venta.usuario}</p>
              <p><b>Fecha:</b> {formatoFecha(detalle.venta.fecha)}</p>

              <hr />

              {detalle.productos.map((p, i) => (
                <div key={i} className="boleta-item">
                  <strong>{p.nombre}</strong>
                  <span>Tipo: {p.tipo_unidad}</span>
                  <span>Cantidad: {p.cantidad}</span>
                  <span>Subtotal: ${formatoCLP(p.precio_unitario * p.cantidad)}</span>
                </div>
                ))}

              <hr />
          
              <h3>Total: ${formatoCLP(detalle.venta.total)}</h3>
          
              <div className="acciones-boleta">
                  <button className="btn-cerrar" onClick={() => setMostrarBoleta(false)}>
                    Cerrar
                  </button>
                  <button
                    className="btn-imprimir"
                    onClick={() => setMostrarSelectorFormato(true)}
                  >
                    Descargar PDF
                  </button>
                </div>
            </div>
          </div>
        )}

      {mostrarSelectorFormato && (
        <div
          className="modal"
          style={{ zIndex: 1000 }}
          onClick={() => !generandoPdf && setMostrarSelectorFormato(false)}
        >
          <div
            className="boleta"
            style={{ maxWidth: 320, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>¿En qué formato?</h3>
            <p style={{ fontSize: 13, color: "#555" }}>
              Elegí el formato del PDF antes de descargarlo
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <button
                className="btn-imprimir"
                disabled={generandoPdf}
                onClick={() => descargarBoleta("termica")}
              >
                Térmica (58mm)
              </button>
              <button
                className="btn-imprimir"
                disabled={generandoPdf}
                onClick={() => descargarBoleta("oficio")}
              >
                Oficio
              </button>
              <button
                className="btn-cerrar"
                disabled={generandoPdf}
                onClick={() => setMostrarSelectorFormato(false)}
              >
                Cancelar
              </button>
            </div>

            {generandoPdf && (
              <p style={{ fontSize: 13, marginTop: 12 }}>Generando PDF...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )}