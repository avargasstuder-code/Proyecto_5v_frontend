import { useState } from "react";
import { api } from "../api";

export default function Login({ setIsAuth }) {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const login = async () => {
    
    try {
    
      const res = await api.post("/auth/login", form);
    
      // guardar token
      localStorage.setItem("token", res.data.token);
    
      // entrar
      setIsAuth(true);
    
    } catch (error) {
    
      console.error(error);
    
      alert(
        error.response?.data?.error ||
        "Error al conectar con el servidor"
      );
    
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Iniciar sesión</h2>

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          style={styles.input}
        />

        <button onClick={login} style={styles.button}>
          Ingresar
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    background: "white",
    padding: "30px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "300px"
  },
  input: {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc"
  },
  button: {
    background: "#2e7d32",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "5px",
    cursor: "pointer"
  }
};