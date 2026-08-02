// Decodifica el token guardado y devuelve el rol del usuario logueado,
// o null si no hay token o no se puede leer.
//
// Nota: esto es solo para decisiones de UI (qué mostrar, a dónde
// redirigir). No reemplaza la validación real, que siempre la hace
// el backend con el token firmado.
export function obtenerRol() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.rol || null;
  } catch {
    return null;
  }
}

// A dónde mandar a cada rol cuando entra a "/" o cuando intenta
// entrar a una página que no le corresponde
export function rutaInicioPorRol(rol) {
  return rol === "admin" ? "/productos" : "/ventas";
}