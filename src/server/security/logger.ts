export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : "")
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : "")
}

export function logError(message: string, meta?: Record<string, unknown>) {
  console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : "")
}
