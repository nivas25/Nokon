import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()
for (const file of ['.env.local', '.env']) {
  const path = resolve(cwd, file)
  if (existsSync(path)) {
    config({ path, override: false })
  }
}
