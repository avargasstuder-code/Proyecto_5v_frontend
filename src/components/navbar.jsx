import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar({ setIsAuth }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const token = localStorage.getItem("token");
  const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const esAdmin = payload?.rol === "admin";

  return (
    <nav className="navbar">
      <h2>Distribuidora 5V</h2>

      <button className="hamburguesa" onClick={() => setMenuAbierto(!menuAbierto)}>
        {menuAbierto ? "✕" : "☰"}
      </button>

      <div className={`links ${menuAbierto ? "abierto" : ""}`}>
        {!esAdmin && (
          <Link to="/ventas" onClick={() => setMenuAbierto(false)}>Ventas</Link>
        )}
        {esAdmin && (
          <Link to="/productos" onClick={() => setMenuAbierto(false)}>Productos</Link>
        )}
        {!esAdmin && (
          <Link to="/clientes" onClick={() => setMenuAbierto(false)}>Clientes</Link>
        )}
        <Link to="/historial" onClick={() => setMenuAbierto(false)}>Historial</Link>
        {!esAdmin && (
          <Link to="/cierre-dia" onClick={() => setMenuAbierto(false)}>Cierre del día</Link>
        )}
        <Link to="/deudores" onClick={() => setMenuAbierto(false)}>Deudores</Link>
        <Link to="/perfil" onClick={() => setMenuAbierto(false)}>Perfil</Link>
        <button onClick={() => {
          localStorage.removeItem("token");
          setIsAuth(false);
        }}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}