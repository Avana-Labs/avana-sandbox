import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const [mode = "dev", ...forwardArgs] = process.argv.slice(2)
const supportedModes = new Set(["dev", "build", "start"])

if (!supportedModes.has(mode)) {
  process.stderr.write(`Unsupported next mode: ${mode}\n`)
  process.exit(1)
}

const modeConfig = {
  dev: {
    distDir: ".next-dev",
    lockFile: ".next-dev.lock.json",
    cleanTargets: [".next-dev", ".next"],
  },
  build: {
    distDir: ".next-prod",
    guardLockFile: ".next-prod.lock.json",
    cleanTargets: [".next-prod", ".next"],
  },
  start: {
    distDir: ".next-prod",
    lockFile: ".next-prod.lock.json",
    cleanTargets: [],
  },
}

const config = modeConfig[mode]
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")

function processExists(pid) {
  if (!pid || typeof pid !== "number") {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readLock(lockName) {
  if (!lockName) {
    return null
  }

  const lockPath = path.join(root, lockName)

  if (!fs.existsSync(lockPath)) {
    return null
  }

  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"))

    if (processExists(lock.pid)) {
      return { ...lock, path: lockPath }
    }
  } catch {
    // ignore malformed lock files and remove them below
  }

  fs.rmSync(lockPath, { force: true })
  return null
}

function writeLock(lockName) {
  if (!lockName) {
    return null
  }

  const lockPath = path.join(root, lockName)
  const payload = {
    pid: process.pid,
    mode,
    cwd: root,
    createdAt: new Date().toISOString(),
  }

  fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2))
  return lockPath
}

function removePath(relativePath) {
  const absolutePath = path.join(root, relativePath)

  if (!fs.existsSync(absolutePath)) {
    return
  }

  fs.rmSync(absolutePath, { recursive: true, force: true })
  process.stdout.write(`removed ${relativePath}\n`)
}

const activeLock = readLock(config.lockFile || config.guardLockFile)

if (activeLock) {
  const action =
    mode === "build"
      ? "Builds cannot rewrite .next-prod while a start server is running"
      : mode === "start"
        ? "A production server is already running for this workspace"
        : "A dev server is already running for this workspace"

  process.stderr.write(`${action} (pid ${activeLock.pid}). Stop it first.\n`)
  process.exit(1)
}

if (!fs.existsSync(nextBin)) {
  process.stderr.write("Could not find Next.js binary under node_modules.\n")
  process.exit(1)
}

for (const target of config.cleanTargets) {
  removePath(target)
}

let lockPath = null
if (config.lockFile) {
  lockPath = writeLock(config.lockFile)
}

function clearLock() {
  if (!lockPath) {
    return
  }

  try {
    fs.rmSync(lockPath, { force: true })
  } catch {
    // ignore lock cleanup failures
  }
}

let child

function forwardSignal(signal) {
  if (child && !child.killed) {
    child.kill(signal)
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"))
process.on("SIGTERM", () => forwardSignal("SIGTERM"))
process.on("exit", clearLock)

child = spawn(process.execPath, [nextBin, mode, ...forwardArgs], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    AVANA_NEXT_DIST_DIR: config.distDir,
  },
})

child.on("exit", (code, signal) => {
  clearLock()

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
