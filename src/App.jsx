import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/login";
import Ventas from "./pages/ventas";
import Productos from "./pages/productos";
import Clientes from "./pages/clientes";
import Navbar from "./components/navbar";
import Historial from "./pages/historial";
import Perfil from "./pages/Perfil";

function App() {
  const [isAuth, setIsAuth] = useState(() => {
    return !!localStorage.getItem("token");
  });

  if (!isAuth) {
    return <Login setIsAuth={setIsAuth} />;
  }

  return (
    <BrowserRouter>
      <Navbar setIsAuth={setIsAuth} />

      <Routes>
        <Route path="/" element={<Navigate to="/ventas" />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;