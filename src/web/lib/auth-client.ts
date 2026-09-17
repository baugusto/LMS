import axios from "axios"

export async function getCurrentUser() {
  try {
    const res = await axios.get("/api/auth/me")
    return res.data.user
  } catch {
    return null
  }
}

export async function logout() {
  await axios.post("/api/auth/logout")
}
