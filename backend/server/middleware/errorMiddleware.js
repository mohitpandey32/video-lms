export function errorHandler(error, _req, res, next) {
  console.error(error)
  if (res.headersSent) return next(error)
  res.status(500).json({ message: 'Something went wrong. Please try again.' })
}
