export function flattenMessages(input: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {}
  Object.entries(input).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, path))
    } else {
      result[path] = String(value)
    }
  })
  return result
}
