const AWS = require('aws-sdk')
const speaker = require('speaker')
const stream = require('stream')

AWS.config.region = "us-east-1"

var polly = new AWS.Polly()

const player = new speaker({
  channels: 1,
  bitDepth: 16,
  sampleRate: 8000
})

let params = {
  OutputFormat: "pcm",
  SampleRate: "8000",
  Text: process.argv[2],
  TextType: "text",
  VoiceId: "Nicole"
}

polly.synthesizeSpeech(params, function(err, data) {
  if (err) {
    console.log(`ERROR: ${err}`, err.stack)
  } else {
    if (data.AudioStream instanceof Buffer) {
      let bufferStream = new stream.PassThrough()
      bufferStream.end(data.AudioStream)
      bufferStream.pipe(player)
      setTimeout(() => {
        console.log('wait')
      }, 5000)
    }
  }
})
