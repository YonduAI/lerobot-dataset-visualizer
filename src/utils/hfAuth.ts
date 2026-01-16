export function getHfAuthHeaders(): HeadersInit | undefined {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return undefined;
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
