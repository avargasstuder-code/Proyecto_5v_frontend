import { Navigate } from "react-router-dom";
import { obtenerRol, rutaInicioPorRol } from "../utils/rol";

// Envolvé cualquier <Route> con esto para restringirla por rol.
// Si el rol actual no está en la lista permitida, redirige a la
// página principal que le corresponde a ese rol (en vez de mostrar
// la página restringida o una pantalla en blanco).
//
// Uso: <Route path="/productos" element={
//   <RutaProtegida rolesPermitidos={["admin"]}><Productos /></RutaProtegida>
// } />
export default function RutaProtegida({ rolesPermitidos, children }) {
  const rol = obtenerRol();

  if (!rolesPermitidos.includes(rol)) {
    return <Navigate to={rutaInicioPorRol(rol)} replace />;
  }

  return children;
}