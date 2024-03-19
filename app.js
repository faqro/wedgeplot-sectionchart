const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const uploadRouter = require('./controllers/upload')
const middleware = require('./utils/middleware')
var bodyParser = require('body-parser')
const path = require('path')

app.use(cors())
app.use(express.static('dist'))
app.use(express.json())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/api', uploadRouter)
app.get('/assets/:id', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), `frontend/assets/${req.params.id}`))
})
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'frontend/index.html'))
})

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app