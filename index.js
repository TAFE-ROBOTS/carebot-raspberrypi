const fs = require('fs')
const express = require('express')
const pimode = true
const sn = 19389921
const cam = pimode ? require('raspicam') : require('node-webcam')
const SerialPort = require('serialport')
const AWS = require('aws-sdk')
const app = express()
const expressWs = require('express-ws')(app)

AWS.config.region = "us-east-1"

let view = "nothing"
let thinking = false
let audioStream = null
let focus //Current face in view

let port = new SerialPort('/dev/ttyACM0', {
  baudRate: 9600
})


let rekognition = new AWS.Rekognition()
var polly = new AWS.Polly()

let camera = pimode ? new cam({mode: "photo", output: "/tmp/eyes.jpg", nopreview: true, timeout: 10, rotation: 270}) : cam.create({width: 640, height: 480, quality: 80, output: "jpeg", device: false, callbackReturn: "location"})
if (pimode) {
  camera.on("read", (err, timestamp, filename) => {
    if (err) {
      console.log(err)
      thinking = false
    } else {
      cortex(filename)
    }
  })
}

rekognition.createCollection({CollectionId: `fn1-friends-${sn}`}, (err, data) => {
  if (err) {
    console.log("Using existing image collection")
  } else {
    console.log("Created a new image collection")
  }
})

function look() {
  if (thinking === false) {
    thinking = true
    if (pimode) {
      camera.start()
    } else {
      camera.capture("/tmp/eyes.jpg", (err, data) => {
        if (err) {
          console.log(err)
          thinking = false
          setTimeout(look, 1000)
        } else {
          cortex(data)
        }
      })
    }
  }
}

function listen() {


}

function setIcon(symbol) {
  console.log(`setting icon to: ${symbol}`)
  port.write(symbol, 'ascii', (err) => {
    if (err) {
      console.log(`Error when comms with arduino: ${err}`)
    }
  })
}

function say(text) {
  setIcon('!')
  console.log(`Saying ${text}`)
  polly.synthesizeSpeech({
    OutputFormat: "mp3",
    SampleRate: "8000",
    Text: text,
    TextType: "text",
    VoiceId: "Nicole"
  }, function(err, mp3) {
     if (err) {
       console.log(err, err.stack)
     } else {
       audioStream = mp3.AudioStream.toString('base64')
     }
  })
}

function checkFace(data) {
  rekognition.searchFacesByImage({CollectionId: `fn1-friends-${sn}`, FaceMatchThreshold: 95, Image: {Bytes: data}, MaxFaces: 1}, function(err, faces) {
    if (err) {
      console.log(err, err.stack)
      thinking = false
      setTimeout(look, 1000)
    } else {
      if (faces.FaceMatches.length > 0) {
        focus = faces.FaceMatches[0]
        console.log(`Hello ${face}`)
        setTimeout(look, 1000)
      } else {
        say("Hello, I don't think we have met. What's your name?")
        listen()
      }
      thinking = false
    }
  })
}

function cortex(filename) {
  console.log(`Got image ${filename}`)
  fs.readFile("/tmp/eyes.jpg", (err, data) => {
    if (err) {
      console.log('failed to read image')
      thinking = false
      setTimeout(look, 1000)
    } else {
      rekognition.detectLabels({Image: {Bytes: data}, MaxLabels: 5, MinConfidence: 60.0}, (err, description) => {
        if (err) {
          console.log(err, err.stack)
          thinking = false
          setTimeout(look, 1000)
        } else {
          if (description.Labels.length > 0) {
            found = false
            description.Labels.forEach(label => {
              if (label.Name === "Face" || label.Name === "Person" || label.Name === "Head") {
                checkFace(data)
                found = true
              }
            })
            view = description.Labels[0].Name
            if (!found) {
              //Other items
              console.log(description)
              thinking = false
              setTimeout(look, 1000)
            }
          } else {
            view = "nothing"
            thinking = false
            setTimeout(look, 1000)
          }
        }
      })
    }
  })
}

look()
setIcon('?')
say("Hello")

app.ws('/echo', (ws, req) => {
  ws.on('message', msg => {
    console.log(msg)
  })
})

function remote(expression, callback) {
  ws.send(expression)
}

app.use(express.static('public'))

app.listen(3000, () => {
  console.log('fn1 is listening on port 3000!')
})
