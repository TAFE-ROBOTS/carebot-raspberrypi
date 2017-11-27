const fs = require('fs')
const express = require('express')
const pimode = false
const sn = 19389921
const webcam = require('node-webcam')
//const raspicam = require('raspicam')
const AWS = require('aws-sdk')
const app = express()
const expressWs = require('express-ws')(app)

AWS.config.loadFromPath('./config.json')

let view = "nothing"
let thinking = false
let audioStream = null

let rekognition = new AWS.Rekognition()
var polly = new AWS.Polly()

let camera = pimode ? new raspicam({mode: "photo", output: "/tmp/eyes.jpg", nopreview: true, timeout: 10, rotation: 270}) : webcam.create({width: 640, height: 480, quality: 80, output: "jpeg", device: false, callbackReturn: "location"})
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
        } else {
          cortex(data)
        }
      })
    }
  }
  setTimeout(look, 500)
}

function say(text) {
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
    } else {
      if (faces.FaceMatches.length > 0) {
        let face = faces.FaceMatches[0]
        console.log(`Hello ${face}`)
      } else {
        say("Hello, I don't think we have met. What's your name?")
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
    } else {
      rekognition.detectLabels({Image: {Bytes: data}, MaxLabels: 5, MinConfidence: 60.0}, (err, description) => {
        if (err) {
          console.log(err, err.stack)
          thinking = false
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
            }
          } else {
            view = "nothing"
            thinking = false
          }
        }
      })
    }
  })
}

look()

//app.use('/static', express.static('static'))


app.ws('/echo', (ws, req) => {
  ws.on('message', msg => {
    console.log(msg)
  })
})

function remote(expression, callback) {
  ws.send(expression)
}

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <script>

          const socket = new WebSocket('ws://localhost:3000/echo');

          socket.addEventListener('open', function (event) {
            socket.send('Hello Server!');
          });

          socket.addEventListener('message', function (event) {
            socket.send(eval(event.data));
          });

        </script>
      </head>
    <h1>Hello</h1>
    <!--<p>I can see ${view}.</p>
    <audio controls src="data:audio/ogg;base64,${audioStream}" autoplay />-->
    </html>
  `)
})

app.listen(3000, () => {
  console.log('fn1 is listening on port 3000!')
})
