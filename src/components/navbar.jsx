import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar({ setIsAuth }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <nav className="navbar">
      <h2>Distribuidora 5V</h2>

      <button className="hamburguesa" onClick={() => setMenuAbierto(!menuAbierto)}>
        {menuAbierto ? "✕" : "☰"}
      </button>

      <div className={`links ${menuAbierto ? "abierto" : ""}`}>
        <Link to="/ventas" onClick={() => setMenuAbierto(false)}>Ventas</Link>
        <Link to="/productos" onClick={() => setMenuAbierto(false)}>Productos</Link>
        <Link to="/clientes" onClick={() => setMenuAbierto(false)}>Clientes</Link>
        <Link to="/historial" onClick={() => setMenuAbierto(false)}>Historial</Link>
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