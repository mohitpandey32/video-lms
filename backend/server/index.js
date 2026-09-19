import app from './app.js'
import { ensureDatabaseIndexes } from './config/database.js'

const port = process.env.PORT || 4000

async function startServer() {
  await ensureDatabaseIndexes()
  app.listen(port, () => console.log(`Arcwell API running at http://localhost:${port}`))
}

startServer().catch((error) => {
  console.error('Arcwell could not connect to MongoDB:', error.message)
  process.exitCode = 1
})
