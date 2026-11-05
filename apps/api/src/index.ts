import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { ZodError } from 'zod'
import { migrate } from './db'
import { router } from './routes'
import { seedIfEmpty } from './seed'

const app = express()

// only our web app (and local dev) may call the api from a browser
const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',')
app.use(cors({ origin: allowed }))
app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api', router)

// turn validation and business errors into clean 400s, everything else is a 500
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const first = err.issues[0]
    return res.status(400).json({ error: `${first.path.join('.') || 'body'}: ${first.message}` })
  }
  if (err instanceof Error && !('code' in err)) {
    return res.status(400).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'something went wrong' })
})

const port = Number(process.env.PORT) || 4000

async function start() {
  await migrate()
  if (process.env.SEED !== 'false') await seedIfEmpty()
  app.listen(port, () => console.log(`api on :${port}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
