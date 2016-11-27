(function() {

  /**
   * Buffer source example
   */

  var $el     = document.getElementById('buffer-source-example')
  var $canvas = $el.querySelector('canvas')

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer($canvas, size, 100, 0.1, true)

  var bufferSource, buffer, gain

  _.createAudioBuffer('./assets/audio/looking-glass.wav').then(function(arrayBuffer) {

    ctx.decodeAudioData(arrayBuffer, function(buf) {
      buffer = buf

      // Make connection
      listeners(bufferSource)

      // Start equalizer
      equalizer.start()

      function update() {
        window.requestAnimationFrame(update)
        if (bufferSource && bufferSource.buffer) {
          equalizer.cursor = bufferSource.currentTime / bufferSource.buffer.duration
        }
      }

      update()
    }, function() {
      console.log('Oh oh! Decoding failed :(')
    })

  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })


  var connect = function() {
    bufferSource = ctx.createBufferSource()
    bufferSource.buffer = buffer
    bufferSource.startTime = bufferSource.context.currentTime
    bufferSource.currentTime = 0

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
      if (!bufferSource) {
        processor.onaudioprocess = null
        processor.disconnect(0)
        analyser.disconnect(0)
        return
      }

      bufferSource.currentTime = bufferSource.context.currentTime - bufferSource.startTime
      bufferSource.currentTime = Math.min(bufferSource.currentTime, bufferSource.buffer.duration)
      analyser.getFloatTimeDomainData(equalizer.data)
    }


    /**
     * Volume node
     */
    gain = ctx.createGain()

    /**
     * Analyse data from source
     *
     * INPUT -> Gain -> ANALYSER (only fetch input data) -> OUTPUT
     */
    bufferSource.connect(gain)
                .connect(analyser)
                .connect(processor)
                .connect(ctx.destination)

    /**
     * Get sound
     *
     * INPUT -> Gain -> OUTPUT
     */
    bufferSource.connect(gain)
                .connect(ctx.destination)
  }

  var listeners = function() {

    var inputsArray = [
      'play', 'resume', 'pause', 'stop', 'volume'
    ]

    var inputs = {}

    var startTime = 0
    var position  = 0
    var playing   = false

    var $div = document.createElement('div')
    $el.appendChild($div)

    for (var i = 0, input; i < inputsArray.length; i++) {

      if (inputsArray[i] === 'volume') {
        input       = document.createElement('input')
        input.type  = 'range'
        input.value = 1
        input.min   = 0
        input.max   = 1
        input.step  = 0.01
        input.addEventListener('mousemove', function() {
          gain.gain.value = parseFloat(this.value)
        })
      } else {
        input       = document.createElement('input')
        input.type  = 'button'
        input.value = inputsArray[i]

        input.addEventListener('click', function() {
          if (this.value === 'play') {
            if (playing) return
            playing = true

            connect()
            bufferSource.start(bufferSource.context.currentTime, 0)
          } else if (this.value === 'resume') {
            if (playing) return
            playing = true

            connect()
            startTime = bufferSource.context.currentTime - position
            bufferSource.startTime = startTime
            bufferSource.start(bufferSource.context.currentTime, position)
          } else if (this.value === 'pause') {
            if (!playing) return
            playing = false

            position = bufferSource.context.currentTime - startTime
            bufferSource.stop(0)
            bufferSource.disconnect(0)
            bufferSource = null
          } else {
            if (!playing) return
            playing = false

            position = 0
            bufferSource.stop(0)
            bufferSource.disconnect(0)
            bufferSource = null
          }
        })
      }

      $div.appendChild(input)
    }

  }

})()