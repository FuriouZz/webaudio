/**
 * Get AudioContext
 */
window.AudioContext = window.AudioContext || window.webkitAudioContext

/**
 * Example with a buffer source
 */
var BufferSourceExample = function () {

  var ctx = new AudioContext

  _.createAudioBuffer('./assets/audio/191 Bars (remasterised).wav').then(function(arrayBuffer) {
    ctx.decodeAudioData(arrayBuffer, function(buffer) {
      var bufferSource    = ctx.createBufferSource()
      bufferSource.buffer = buffer
      bufferSource.connect(ctx.destination)
      bufferSource.start()
    }, function() {
      console.log('Oh oh! Decoding failed :(')
    })
  }).catch(function() {
    console.log('Oh oh! Loading failed :(')
  })

}

/**
 * Example with a element source
 */
var AudioElementExample = function() {

  var ctx = new AudioContext

  _.createAudioElement('./assets/audio/191 Bars (remasterised).wav').then(function(audioElement) {
    var mediaElementSource = ctx.createMediaElementSource(audioElement)
    mediaElementSource.connect(ctx.destination)
    audioElement.play()
    document.body.appendChild(audioElement)
  }).catch(function() {
    console.log('Oh oh! Loading failed :(')
  })

}

/**
 *
 */
var AudioStreamExample = function() {

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer(size, 100, 0.1, false)

  _.createAudioStream({ video: false, audio: true }).then(function(mediaStream, url) {
    var mediaStreamSource = ctx.createMediaStreamSource(mediaStream)

    /**
     * Create a analyser node
     * [MDN] It is an AudioNode that passes the audio stream unchanged from the input to the output,
     * but allows you to take the generated data, process it, and create audio visualizations.
     */
    var analyser = ctx.createAnalyser()
    analyser.smoothingTimeConstant = 0.8
    analyser.fftSize = size

    /**
     * A script processing is an interface used for direct audio processing.
     *
     * @param {Number} bufferSize
     * Must be a power of 2 value : 256, 512, 1024, 2048, 4096, 8192, 16384.
     * This value controls how frequently the audioprocess event is dispatched
     * and how many sample-frames need to be processed each call.
     * Lower is the value better is the latency.
     *
     * @param {Number} numberInputChannel
     * @param {Number} numberOutputChannel
     */
    var processor = ctx.createScriptProcessor(1024, 1, 1)
    processor.onaudioprocess = function() {
      analyser.getFloatTimeDomainData(equalizer.data)
    }

    /**
     * Connections
     */
    mediaStreamSource.connect(analyser)
    analyser.connect(processor)
    processor.connect(ctx.destination)

    equalizer.start()
  })

}
/**
 *
 */
var EqualizerExample = function() {

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer(size, 100, 0.1, false)

  _.createAudioElement('./assets/audio/191 Bars (remasterised).wav').then(function(audioElement) {
    var mediaElementSource = ctx.createMediaElementSource(audioElement)
    document.body.appendChild(audioElement)

    /**
     * Create a analyser node
     * [MDN] It is an AudioNode that passes the audio stream unchanged from the input to the output,
     * but allows you to take the generated data, process it, and create audio visualizations.
     */
    var analyser = ctx.createAnalyser()
    analyser.smoothingTimeConstant = 0.8
    analyser.fftSize = size

    /**
     * A script processing is an interface used for direct audio processing.
     *
     * @param {Number} bufferSize
     * Must be a power of 2 value : 256, 512, 1024, 2048, 4096, 8192, 16384.
     * This value controls how frequently the audioprocess event is dispatched
     * and how many sample-frames need to be processed each call.
     * Lower is the value better is the latency.
     *
     * @param {Number} numberInputChannel
     * @param {Number} numberOutputChannel
     */
    var processor = ctx.createScriptProcessor(1024, 1, 1)
    processor.onaudioprocess = function() {
      analyser.getFloatTimeDomainData(equalizer.data)
    }

    /**
     * Analyse data from source
     *
     * INPUT -> ANALYSER (only fetch input data) -> OUTPUT
     */
    mediaElementSource.connect(analyser)
    analyser.connect(processor)
    processor.connect(ctx.destination)

    /**
     * Get sound
     *
     * INPUT -> OUTPUT
     */
    mediaElementSource.connect(ctx.destination)

    audioElement.play()
    equalizer.start()
  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })

}

var SpatialExample = function() {
  var ctx = new AudioContext

  // Listener
  var listener = ctx.listener

  // Panner
  var panner = ctx.createPanner()
  panner.coneInnerAngle = 360
  panner.coneOuterAngle = 0
  panner.coneOuterGain  = 0
  panner.distanceModel = 'inverse'
  panner.panningModel = 'HRTF'

  // Canvas
  var spatial = _.createSpatialCanvas(panner, listener)

  _.createAudioElement('./assets/audio/191 Bars (remasterised).wav').then(function(audioElement) {
    var mediaElementSource = ctx.createMediaElementSource(audioElement)
    document.body.appendChild(audioElement)

    mediaElementSource.connect(panner)
    panner.connect(ctx.destination)

    audioElement.play()
    spatial.start()
  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })

}


var FilterExample = function() {

  var ctx = new AudioContext

  var div = document.createElement('div')
  document.body.appendChild(div)

  var filter

  var input

  var passes = [
    'lowpass',
    'highpass',
    'bandpass',
    'lowshelf',
    'highshelf',
    'peaking',
    'notch',
    'allpass'
  ]

  for (var i in passes) {
    input = document.createElement('input')
    input.type = 'button'
    input.value = passes[i]
    input.addEventListener('click', function() {
      filter.type = this.value
    })
    div.appendChild(input)
  }

  var frequency = document.createElement('input')
  frequency.type  = 'range'
  frequency.min   = 0
  frequency.max   = 1000
  frequency.value = 500

  var label = document.createElement('label')
  label.innerHTML = '<span>Frequency:</span>'
  label.appendChild(frequency)

  div.appendChild(label)

  function render() {
    window.requestAnimationFrame(render)
    filter.frequency.value = parseFloat(frequency.value)
  }

  _.createAudioBuffer('./assets/audio/191 Bars (remasterised).wav').then(function(arrayBuffer) {

    ctx.decodeAudioData(arrayBuffer, function(buffer) {
      // Create a buffer with offline context
      var bufferSource    = ctx.createBufferSource()
      bufferSource.buffer = buffer

      // Create filter
      filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'

      // Pipe the song into the filter, and the filter into the offline context
      bufferSource.connect(filter)
      filter.connect(ctx.destination)

      // Play
      bufferSource.start(0)

      render()

    }, function() {
      console.log('Oh oh! Decoding failed :(')
    })


  })

}


var EXAMPLES = {
  "audio-element": AudioElementExample,
  "buffer-source": BufferSourceExample,
  "equalizer": EqualizerExample,
  "audio-stream": AudioStreamExample,
  "spatial": SpatialExample,
  "filter": FilterExample
}

var key = window.location.search.replace('?', '')
if (EXAMPLES[key]) {
  EXAMPLES[key]()
} else {
  var html = ''

  for (var k in EXAMPLES) {
    html += '<li><a href="'+window.location.origin+'?'+k+'">'
    html += k
    html += '</a></li>'
  }

  var div = document.createElement('ul')
  div.innerHTML = html
  document.body.appendChild(div)
}