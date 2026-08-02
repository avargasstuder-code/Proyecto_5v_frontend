import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/historial.css";
import html2pdf from "html2pdf.js/dist/html2pdf.bundle.min.js";

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

// Tamaño de hoja oficio (Chile), en milímetros
const OFICIO_ANCHO_MM = 216;
const OFICIO_ALTO_MM = 330;
const OFICIO_MARGEN_MM = 15;

// Algunos celulares (sobre todo gama media/baja) no soportan canvas
// muy altos con escala alta: el navegador simplemente deja en blanco
// todo lo que sobra del límite. Si el contenido es muy largo, bajamos
// la escala automáticamente para no pasarnos de ese límite, sin perder
// nitidez en las boletas cortas.
const ALTO_MAXIMO_CANVAS_PX = 4000;

function calcularEscalaSegura(altoContenidoPx, escalaDeseada = 3) {
  const altoConEscala = altoContenidoPx * escalaDeseada;
  if (altoConEscala <= ALTO_MAXIMO_CANVAS_PX) return escalaDeseada;
  const escalaAjustada = ALTO_MAXIMO_CANVAS_PX / altoContenidoPx;
  return Math.max(escalaAjustada, 1.5); // nunca bajar de 1.5, para que siga siendo legible
}

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

            <p>Cliente: ${detalle.venta.cliente}</p>
            <p>Rut: ${formatoRUT(detalle.venta.rut)}</p>
            <p>Ciudad: ${detalle.venta.ciudad || ""}</p>
            <p>Vendedor: ${detalle.venta.usuario}</p>
            <p>Fecha: ${formatoFecha(detalle.venta.fecha)}</p>
            <p>Pago: ${formatoPago(detalle.venta)}</p>
            <hr/>

            ${detalle.productos.map(p => `
              <div class="item">
                <span>${p.nombre}</span>
                <span>${p.tipo_unidad}</span>
                <span>x${p.cantidad}</span>
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

  // Prepara un clon "limpio" de la boleta (sin botones) listo para capturar
  const clonarBoletaParaPdf = () => {
    const original = document.querySelector(".boleta");
    if (!original) return null;

    const clone = original.cloneNode(true);
    const acciones = clone.querySelector(".acciones-boleta");
    if (acciones) acciones.remove();

    return clone;
  };

  // FORMATO TÉRMICO: página del ancho exacto de la impresora (58mm),
  // con el alto ajustado al contenido, como un ticket
  const generarPdfTermico = (clone, wrapper) => {
    clone.classList.add("boleta-58mm");

    // 58mm de ancho físico, convertido a píxeles a 96dpi (~219px)
    const anchoPx = Math.round((58 / 25.4) * 96);
    clone.style.width = `${anchoPx}px`;

    // Medimos el alto real ya angostada, para no dejar espacio en blanco
    // ni cortar contenido (el ticket crece o se achica según los productos)
    const altoPx = clone.scrollHeight;
    const altoMM = (altoPx / 96) * 25.4 + 5; // +5mm de margen de cola
    const escala = calcularEscalaSegura(altoPx);

    return {
      margin: 0,
      filename: `guia-venta-${detalle?.venta?.id || "sin-id"}-termica.pdf`,
      html2canvas: {
        scale: escala,
        // Forzamos el alto/ancho de captura al del contenido real,
        // en vez de dejar que use el alto de la pantalla del dispositivo
        // (esto era lo que cortaba la guía en celulares con pantalla chica)
        width: anchoPx,
        height: altoPx,
        windowWidth: anchoPx,
        windowHeight: altoPx,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: "mm", format: [58, altoMM], orientation: "portrait" }
    };
  };

  // FORMATO OFICIO: página de tamaño fijo (216 x 330mm), con margen real
  // de hoja. Si el contenido no entra en una página, se pagina solo.
  const generarPdfOficio = (clone) => {
    clone.classList.add("boleta-oficio");

    const anchoContenidoMM = OFICIO_ANCHO_MM - OFICIO_MARGEN_MM * 2;
    const anchoPx = Math.round((anchoContenidoMM / 25.4) * 96);

    clone.style.width = `${anchoPx}px`;
    // Tamaño de letra un poco más grande para que se vea bien en hoja
    // completa (en la térmica el CSS .boleta-58mm ya achica la letra)
    clone.style.fontSize = "16px";

    // Medimos el alto real del contenido YA con el ancho final aplicado.
    // Sin esto, html2canvas solo capturaba lo que entraba en la pantalla
    // visible del dispositivo, y el resto de la boleta quedaba cortado
    // (pasaba en compu y en celular con ventas largas).
    const altoPx = clone.scrollHeight;
    const escala = calcularEscalaSegura(altoPx);

    return {
      margin: OFICIO_MARGEN_MM,
      filename: `guia-venta-${detalle?.venta?.id || "sin-id"}-oficio.pdf`,
      html2canvas: {
        scale: escala,
        width: anchoPx,
        height: altoPx,
        windowWidth: anchoPx,
        windowHeight: altoPx,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: "mm", format: [OFICIO_ANCHO_MM, OFICIO_ALTO_MM], orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };
  };

  const descargarBoleta = async (formato) => {
    setMostrarSelectorFormato(false);

    const clone = clonarBoletaParaPdf();
    if (!clone) {
      alert("No se encontró la boleta");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const opt = formato === "oficio"
      ? generarPdfOficio(clone)
      : generarPdfTermico(clone, wrapper);

    setGenerandoPdf(true);

    try {
      // En celulares (sobre todo Android) a veces la captura arranca
      // antes de que el navegador termine de acomodar fuentes y
      // diseño, lo que corta la boleta de forma inconsistente.
      // Esperamos a que las fuentes terminen de cargar, más un
      // pequeño respiro extra, antes de capturar.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 200));

      await html2pdf().set(opt).from(clone).save();
    } catch (error) {
      console.error(error);
      alert("Error al generar el PDF");
    } finally {
      document.body.removeChild(wrapper);
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
              <p><b>Pago:</b> {formatoPago(detalle.venta)}</p>

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
          onClick={() => setMostrarSelectorFormato(false)}
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
                🧾 Térmica (58mm)
              </button>
              <button
                className="btn-imprimir"
                disabled={generandoPdf}
                onClick={() => descargarBoleta("oficio")}
              >
                📄 Oficio (para la contadora)
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