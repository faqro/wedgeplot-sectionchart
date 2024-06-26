const uploadRouter = require('express').Router()
var path = require('path')
var im = require('sharp')
var fs = require('fs')
const { parse } = require("csv-parse")
const config = require('../utils/config')

//SETUP INFO
const { FILENAME, DOTSIZE, DOTFILENAME, ROOTPOS, LEFTEXTREME, RIGHTEXTREME, MAXMAGNITUDE, MINANG, MAXANG, LINESKIP, CSVFILENAME } = config

const LEFTANGLE = Math.atan2(LEFTEXTREME[1] - ROOTPOS[1], LEFTEXTREME[0] - ROOTPOS[0])
const RIGHTANGLE = Math.atan2(RIGHTEXTREME[1] - ROOTPOS[1], RIGHTEXTREME[0] - ROOTPOS[0])
const LEFTDIST = Math.hypot(LEFTEXTREME[1] - ROOTPOS[1], LEFTEXTREME[0] - ROOTPOS[0])
const RIGHTDIST = Math.hypot(RIGHTEXTREME[1] - ROOTPOS[1], RIGHTEXTREME[0] - ROOTPOS[0])

const mapDot = (angleValue, magnitude) => {
  const newAngle = ((RIGHTANGLE-LEFTANGLE)*angleValue) + LEFTANGLE
  const totalDist = ((RIGHTDIST-LEFTDIST)*angleValue) + LEFTDIST
  const myDist = totalDist * magnitude

  const returnXVal = Math.round(ROOTPOS[0] + (myDist * Math.cos(newAngle)) - (DOTSIZE[0]/2))
  const returnYVal = Math.round(ROOTPOS[1] + (myDist * Math.sin(newAngle)) - (DOTSIZE[1]/2))

  return [returnXVal, returnYVal]
}

const createVectorArray = (cb, failer) => {
  const csvDir = path.dirname(__dirname) + '/uploads/' + CSVFILENAME

  const scaledArray = []

  fs.createReadStream(csvDir)
    .pipe(parse({ delimiter: ",", from_line: LINESKIP }))
    .on("data", function (row) {
      scaledArray.push([((row[0] - MINANG) / (MAXANG - MINANG)), (row[1] / MAXMAGNITUDE)])
    })
    .on("end", function () {
      console.log(`Read ${scaledArray.length} datapoints from .csv file`)
      cb(scaledArray)
    })
    .on("error", function () {
      console.error("Error when parsing CSV")
      failer()
    })
}

const dotGenerate = (dotDir, pos) => {
  return ({ input: dotDir, left: pos[0], top: pos[1]})
}

const resizeImage = async(inFile, outFile, arr) => {
  const dotDir = path.dirname(__dirname) + '/uploads/' + DOTFILENAME

  const mappedArray = arr.map((n, i) => {
    return dotGenerate(dotDir, mapDot(n[0], n[1]))
  })

  try {
    await im(inFile)
      .composite(mappedArray)
      .timeout({ seconds: 20 })
      .toFile(outFile)
    return true
  } catch(e) {
    console.log(e)
    return false
  }
}

uploadRouter.get('/', async(req, res) => {

  const filePath = path.join(path.dirname(__dirname) + '/uploads/'+FILENAME)
  const filePathResized = path.join(path.dirname(__dirname) + '/uploads/' + 'upl-' + new Date().getTime() + FILENAME)

  createVectorArray(async(arr) => {
    const success = await resizeImage(filePath, filePathResized, arr)
    return res.sendStatus(success ? 200 : 400)
  }, () => {
    return res.sendStatus(500)
  })
})

module.exports = uploadRouter