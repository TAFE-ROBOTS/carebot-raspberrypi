const AWS = require('aws-sdk')
const Speaker = require('sdl-speaker')
const stream = require('stream')

AWS.config.region = "us-east-1"

var polly = new AWS.Polly()

const speaker = new Speaker({
  sampleRate: 16000,
  channels: 1,
  samplesPerFrame: 320
});

let params = {
  OutputFormat: "pcm",
  SampleRate: "16000",
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
      bufferStream.pipe(speaker)
      setTimeout(() => {
        console.log('wait')
      }, 5000)
    }
  }
})
