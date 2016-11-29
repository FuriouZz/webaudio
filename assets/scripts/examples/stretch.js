(function() {

  /**
   * Buffer source example
   */

  var $el     = document.getElementById('stretch-example')
  var $canvas = $el.querySelector('canvas')

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer($canvas, size, 100, 0.1, true)

  var bufferSource, buffer, gain, playbackRate = 1

  var $notify = document.createElement('div')
  $notify.style.cssText = 'font-size: 12px; text-transform: uppercase; font-weight: bold; color: #1c1c69'
  $el.appendChild($notify)

  _.createAudioBuffer('./assets/audio/looking-glass.wav').then(function(arrayBuffer) {
    ctx.decodeAudioData(arrayBuffer, function(buf) {
      buffer = buf
    }, function() {
      console.log('Oh oh! Decoding failed :(')
    })
  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })

  var setup = function() {

    // Make connection
    listeners()

    // Start equalizer
    equalizer.start()

    // Update cursor
    function update() {
      window.requestAnimationFrame(update)
      if (bufferSource && bufferSource.buffer) {
        equalizer.cursor = bufferSource.currentTime / bufferSource.buffer.duration
      }
    }

    update()

    // File upload
    var reader = new FileReader
    var input  = document.createElement('input')
    input.type = "file"
    input.name = "files[]"
    input.setAttribute('multiple', true)
    input.addEventListener('change', function(e) {
      reader.onload = function(e) {
        ctx.decodeAudioData(reader.result, function(buf) {
          buffer = buf
          notify('[!!] Ready to play')
        }, function(err) {
          console.log('Oh oh! Something failed :(')
          throw err
        })
      }
      reader.readAsArrayBuffer(e.currentTarget.files[0])
    })
    $el.appendChild(input)

  }

  var notify = function(message) {
    $notify.innerHTML = message
    setTimeout(function() {
      $notify.innerHTML = ''
    }, 2000)
  }

  var connect = function() {
    bufferSource = ctx.createBufferSource()
    bufferSource.buffer = buffer
    bufferSource.startTime = bufferSource.context.currentTime
    bufferSource.currentTime = 0
    bufferSource.playbackRate.value = playbackRate

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
      'play', 'resume', 'pause', 'stop', 'volume', 'playbackRate'
    ]

    var inputs = {}

    var startTime    = 0
    var time         = 0
    var playing      = false

    var $div = document.createElement('div')
    $el.appendChild($div)


    /**
     * Play
     */
    function play() {
      if (!buffer) return
      if (playing) return
      playing = true

      connect()
      time = 0
      startTime = bufferSource.context.currentTime
      bufferSource.startTime = startTime
      bufferSource.start(bufferSource.context.currentTime, time)
    }


    /**
     * Resume
     */
    function resume() {
      if (!buffer) return
      if (playing) return
      playing = true

      connect()
      startTime = bufferSource.context.currentTime - time
      bufferSource.startTime = startTime
      bufferSource.start(bufferSource.context.currentTime, time)
    }


    /**
     * Pause
     */
    function pause() {
      if (!buffer) return
      if (!playing) return
      playing = false

      time = bufferSource.context.currentTime - startTime
      bufferSource.stop(0)
      bufferSource.disconnect(0)
      bufferSource = null
    }


    /**
     * Stop
     */
    function stop() {
      if (!buffer) return
      if (!playing) return
      playing = false

      time = 0
      bufferSource.stop(0)
      bufferSource.disconnect(0)
      bufferSource = null
    }

    function seek() {
      equalizer.onmousedown = function() {
        pause()
        time = equalizer.cursor * buffer.duration
      }

      equalizer.onmousemove = function() {
        time = equalizer.cursor * buffer.duration
      }

      equalizer.onmouseup = function() {
        resume()
      }
    }

    seek()

    /**
     * Setup
     */
    var input

    for (var i = 0; i < inputsArray.length; i++) {

      if (inputsArray[i] === 'volume') {
        var volumeElement = document.createElement('span')

        input       = document.createElement('input')
        input.type  = 'range'
        input.value = 1
        input.min   = 0
        input.max   = 1
        input.step  = 0.01
        input.addEventListener('mousemove', function() {
          if (gain) {
            gain.gain.value = parseFloat(this.value)
            volumeElement.innerHTML = this.value
          }
        })

        var label = document.createElement('label')
        label.innerHTML = '<br>Volume: '
        label.appendChild(volumeElement)
        label.appendChild(document.createElement('br'))
        label.appendChild(input)
        input = label
      } else if (inputsArray[i] === 'playbackRate') {
        var playbackRateElement = document.createElement('span')

        input       = document.createElement('input')
        input.type  = 'range'
        input.value = 0
        input.min   = -1
        input.max   = 1
        input.step  = 0.001
        input.style.width = '500px'
        input.addEventListener('mousemove', function() {
          if (bufferSource) {
            var value = parseFloat(this.value)
            if (value < 0) {
              value = 1 - Math.abs(value)
            } else {
              value = 1 + value * 10
            }

            playbackRate = value
            bufferSource.playbackRate.value = value
            playbackRateElement.innerHTML = value
          }
        })

        var label = document.createElement('label')
        label.innerHTML = '<br>Playback Rate (between 0.01 and 10, default: 1): '
        label.appendChild(playbackRateElement)
        label.appendChild(document.createElement('br'))
        label.appendChild(input)
        input = label
      } else {
        input       = document.createElement('input')
        input.type  = 'button'
        input.value = inputsArray[i]

        input.addEventListener('click', function() {
          if      (this.value === 'play'  ) { play()   }
          else if (this.value === 'resume') { resume() }
          else if (this.value === 'pause' ) { pause()  }
          else                              { stop()   }
        })
      }

      $div.appendChild(input)
    }

  }

  setup()

})()