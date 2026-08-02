import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/login";
import Ventas from "./pages/ventas";
import Productos from "./pages/productos";
import Clientes from "./pages/clientes";
import Navbar from "./components/navbar";
import Historial from "./pages/historial";
import Perfil from "./pages/perfil";
import CierreDia from "./pages/cierre_dia";
import Deudores from "./pages/deudores";
import RutaProtegida from "./components/RutaProtegida";
import { obtenerRol, rutaInicioPorRol } from "./utils/rol";

function App() {
  const [isAuth, setIsAuth] = useState(() => {
    return !!localStorage.getItem("token");
  });

  if (!isAuth) {
    return <Login setIsAuth={setIsAuth} />;
  }

  const rol = obtenerRol();

  return (
    <BrowserRouter>
      <Navbar setIsAuth={setIsAuth} />

      <Routes>
        <Route path="/" element={<Navigate to={rutaInicioPorRol(rol)} replace />} />

        <Route path="/ventas" element={
          <RutaProtegida rolesPermitidos={["vendedor"]}><Ventas /></RutaProtegida>
        } />
        <Route path="/clientes" element={
          <RutaProtegida rolesPermitidos={["vendedor"]}><Clientes /></RutaProtegida>
        } />
        <Route path="/cierre-dia" element={
          <RutaProtegida rolesPermitidos={["vendedor"]}><CierreDia /></RutaProtegida>
        } />

        <Route path="/productos" element={
          <RutaProtegida rolesPermitidos={["admin"]}><Productos /></RutaProtegida>
        } />

        {/* Accesibles para cualquier rol logueado */}
        <Route path="/historial" element={<Historial />} />
        <Route path="/deudores" element={<Deudores />} />
        <Route path="/perfil" element={<Perfil />} />

        {/* Cualquier ruta no reconocida, la mandamos a la página principal del rol */}
        <Route path="*" element={<Navigate to={rutaInicioPorRol(rol)} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;