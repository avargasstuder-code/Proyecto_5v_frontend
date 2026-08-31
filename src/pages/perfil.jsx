import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/perfil.css";

export default function Perfil() {

  const [usuarios, setUsuarios] = useState([]);
  const [passwords, setPasswords] = useState({ actual: "", nueva: "", confirmarNueva: "" });
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "", username: "", email: "", password: "", rol: "vendedor"
  });
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [nuevoUsername, setNuevoUsername] = useState("");

  const token = localStorage.getItem("token");
  const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const esAdmin = payload?.rol === "admin";

  useEffect(() => {
    if (!token) {
      window.location.href = "/";
      return;
    }
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await api.get("/auth/usuarios");
      setUsuarios(res.data);
    } catch (error) {
      console.error("ERROR USUARIOS:", error.response?.data || error);
    }
  };

  const cambiarPassword = async () => {
    try {
      await api.put("/auth/cambiar-password", {
        actual: passwords.actual,
        nueva: passwords.nueva
      });
      alert("Contraseña actualizada");
      setPasswords({ actual: "", nueva: "", confirmarNueva: "" });
      setMostrarConfirmacion(false);
    } catch (error) {
      alert(error.response?.data?.error || "Error");
      setMostrarConfirmacion(false);
    }
  };

  const cambiarUsername = async () => {
    if (!nuevoUsername.trim()) {
      return alert("Escribí el nuevo username");
    }

    try {
      await api.put("/auth/cambiar-username", { username: nuevoUsername.trim() });
      alert("Username actualizado. La próxima vez que inicies sesión, usá el nuevo.");
      setNuevoUsername("");
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    }
  };

  const crearUsuario = async () => {
    try {
      await api.post("/auth/register", nuevoUsuario);
      alert("Usuario creado");
      setNuevoUsuario({ nombre: "", username: "", email: "", password: "", rol: "vendedor" });
      cargarUsuarios();
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    }
  };

  const cambiarEstado = async (id, activo) => {
    try {
      await api.put(`/auth/usuarios/${id}/activo`, { activo: !activo });
      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  if (!token || !payload) return null;

  return (
    <div className="perfil-container">
      <h1>Perfil</h1>

      <div className="card-perfil">
        <h2>Cambiar contraseña</h2>
        <input
          type="password"
          placeholder="Contraseña actual"
          value={passwords.actual}
          onChange={(e) => setPasswords({ ...passwords, actual: e.target.value })}
        />
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={passwords.nueva}
          onChange={(e) => setPasswords({ ...passwords, nueva: e.target.value })}
        />
        <input
          type="password"
          placeholder="Repetir nueva contraseña"
          value={passwords.confirmarNueva}
          onChange={(e) => setPasswords({ ...passwords, confirmarNueva: e.target.value })}
        />
        <button
          onClick={() => {
            if (!passwords.actual || !passwords.nueva || !passwords.confirmarNueva) {
              return alert("Completa los 3 campos");
            }
            if (passwords.nueva !== passwords.confirmarNueva) {
              return alert("La nueva contraseña no coincide con la confirmación");
            }
            setMostrarConfirmacion(true);
          }}
        >
          Guardar contraseña
        </button>
      </div>

      <div className="card-perfil">
        <h2>Cambiar mi username</h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>
          Es lo que usás para iniciar sesión, en vez del correo.
        </p>
        <input
          placeholder="Nuevo username"
          value={nuevoUsername}
          onChange={(e) => setNuevoUsername(e.target.value)}
        />
        <button onClick={cambiarUsername}>Guardar username</button>
      </div>

      {esAdmin && (
        <>
          <div className="card-perfil">
            <h2>Crear Nuevo Usuario</h2>
            <input
              placeholder="Nombre"
              value={nuevoUsuario.nombre}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
            />
            <input
              placeholder="Username (para iniciar sesión)"
              value={nuevoUsuario.username}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })}
            />
            <input
              placeholder="Correo (opcional)"
              value={nuevoUsuario.email}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value.toLowerCase() })}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={nuevoUsuario.password}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
            />
            <select
              value={nuevoUsuario.rol}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
            >
              <option value="vendedor">Vendedor</option>
            </select>
            <button onClick={crearUsuario}>Crear usuario</button>
          </div>

          <div className="card-perfil">
            <h2>Usuarios</h2>
            <div className="usuarios-lista">
              {usuarios.map(u => (
                <div key={u.id} className="usuario-item">
                  <div>
                    <strong>{u.nombre}</strong>
                    <p>@{u.username}</p>
                    <span>{u.rol}</span>
                  </div>
                  <button
                    disabled={u.id === payload.id}
                    className={
                      u.id === payload.id ? "btn-bloqueado"
                      : u.activo ? "btn-desactivar"
                      : "btn-activar"
                    }
                    onClick={() => {
                      if (u.id === payload.id) return;
                      cambiarEstado(u.id, u.activo);
                    }}
                  >
                    {u.id === payload.id ? "Tu cuenta" : u.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* MODAL CONFIRMACIÓN CAMBIO DE CONTRASEÑA */}
      {mostrarConfirmacion && (
        <div className="modal">
          <div className="modal-content">
            <h2>¿Estás seguro que quieres cambiar la contraseña?</h2>
            <div className="acciones">
              <button onClick={cambiarPassword}>Sí</button>
              <button onClick={() => setMostrarConfirmacion(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}