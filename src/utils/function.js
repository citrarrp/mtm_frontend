export async function fetchData() {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/data/`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
