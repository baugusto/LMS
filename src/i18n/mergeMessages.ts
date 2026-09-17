export function applyOverrides(base: Record<string, any>, overrides: Record<string, string>) {
  const result = JSON.parse(JSON.stringify(base))

  const setDeep = (obj: Record<string, any>, path: string, value: string) => {
    const parts = path.split(".")
    const last = parts.pop()
    if (!last) return
    let current = obj
    parts.forEach((part) => {
      if (typeof current[part] !== "object" || current[part] === null) {
        current[part] = {}
      }
      current = current[part]
    })
    current[last] = value
  }

  Object.entries(overrides).forEach(([key, value]) => setDeep(result, key, value))
  return result
}
