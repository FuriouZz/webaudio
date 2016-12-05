(function() {

  /**
   * Reverb example
   */

  var $el     = document.getElementById('reverb-example')
  var $canvas = $el.querySelector('canvas')

  var ctx  = new AudioContext
  var loop = false

  var ui    = {}
  var sound = {
    paused: true,
    startTime: 0,
    currentTime: 0,
    time: 0,

    _volume: 1,
    _reverb: 0,
    _playbackRate: 1,
    _hGain: 1,
    _mGain: 1,
    _lGain: 1
  }

  function createButton(name, callback) {
    var input   = document.createElement('input')
    input.value = name
    input.type  = 'button'
    input.addEventListener('click', callback)

    return input
  }

  function createSlider(name, value, range, step, callback) {
    var $div = document.createElement('div')

    var span = document.createElement('span')

    var input   = document.createElement('input')
    input.value = name
    input.type  = 'range'
    input.value = value
    input.min   = range[0]
    input.max   = range[1]
    input.step  = step
    callback    = callback.bind(input)
    input.addEventListener('mousemove', function() {
      span.innerHTML = this.value
      callback( parseFloat(this.value) )
    })

    var label = document.createElement('label')
    label.innerHTML = '<br>'+name+': '
    label.appendChild(span)
    label.appendChild(document.createElement('br'))
    label.appendChild(input)

    $div.appendChild(label)

    return $div
  }

  function createFileReader(name, callback) {
    var $div = document.createElement('div')

    // File upload
    var reader = new FileReader
    var input  = document.createElement('input')
    input.type = "file"
    input.name = "files[]"
    input.setAttribute('multiple', true)
    input.addEventListener('change', function(e) {
      reader.onload = function(e) {
        callback(reader.result)
      }
      reader.readAsArrayBuffer(e.currentTarget.files[0])
    })

    var $span = document.createElement('span')
    $span.innerHTML = name+': '

    $div.appendChild($span)
    $div.appendChild(input)

    return $div
  }

  function createInputs() {
    ui.playButton = createButton('play', function() {
      sound.play()
    })

    ui.pauseButton = createButton('pause', function() {
      sound.pause()
    })

    ui.resumeButton = createButton('resume', function() {
      sound.resume()
    })

    ui.pauseButton = createButton('pause', function() {
      sound.pause()
    })

    ui.stopButton = createButton('stop', function() {
      sound.stop()
    })

    ui.volumeSlider = createSlider('volume', 1, [ 0, 1 ], 0.001, function(value) {
      if (sound.gain) {
        sound.volume(value)
      }
    })

    ui.playbackRateSlider = createSlider('playbackRate', 0, [ -1, 1 ], 0.001, function(value) {
      if (sound.source) {

        if (value < 0) {
          value = 1 - Math.abs(value)
        } else {
          value = 1 + value * 10
        }

        ui.playbackRateSlider.querySelector('span').innerHTML = Math.floor(value * 100) / 100

        sound.playbackRate(value)

      }
    })

    ui.reverbSlider = createSlider('reverb', 0, [ 0, 1 ], 0.001, function(value) {
      if (sound.convolverGain) {
        sound.reverb(value)
      }
    })

    ui.lGainSlider = createSlider('EQ Low Gain', 1, [ 0, 1 ], 0.001, function(value) {
      if (sound.lGain) {
        sound.EQGains(sound._hGain, sound._mGain, value)
      }
    })

    ui.mGainSlider = createSlider('EQ Medium Gain', 1, [ 0, 1 ], 0.001, function(value) {
      if (sound.mGain) {
        sound.EQGains(sound._hGain, value, sound._lGain)
      }
    })

    ui.hGainSlider = createSlider('EQ High Gain', 1, [ 0, 1 ], 0.001, function(value) {
      if (sound.hGain) {
        sound.EQGains(value, sound._mGain, sound._lGain)
      }
    })

    ui.fileReaderInput = createFileReader('sound file', function(result) {
      sound.load(result)
    })

    ui.reverbFileReaderInput = createFileReader('reverb file', function(result) {
      sound.loadReverb(result)
    })

    var $div = document.createElement('div')

    $div.appendChild(ui.playButton)
    $div.appendChild(ui.pauseButton)
    $div.appendChild(ui.resumeButton)
    $div.appendChild(ui.stopButton)

    $el.appendChild($div)

    $el.appendChild(ui.volumeSlider)
    $el.appendChild(ui.playbackRateSlider)
    $el.appendChild(ui.reverbSlider)
    $el.appendChild(ui.fileReaderInput)
    $el.appendChild(ui.reverbFileReaderInput)

    $el.appendChild(ui.lGainSlider)
    $el.appendChild(ui.mGainSlider)
    $el.appendChild(ui.hGainSlider)
  }

  function setup() {
    createInputs()
    setupEqualizer()

    _.createAudioBuffer('./assets/audio/tuffbreak.wav').then(function(arraybuffer) {
      sound.load(arraybuffer)
    }).catch(function(err) {
      console.log('Oh oh! Something failed :(')
      throw err
    })

    _.createAudioBuffer('./assets/audio/tenniscourt.wav').then(function(arraybuffer) {
      sound.loadReverb(arraybuffer)
    }).catch(function(err) {
      console.log('Oh oh! Something failed :(')
      throw err
    })

  }

  function setupEqualizer() {
    var equalizer = _.createEqualizer($canvas, 256, 100, 0.1, true)

    equalizer.start()

    // Listeners
    equalizer.onmousedown = function() {
      sound.pause()
      sound.seek(equalizer.cursor)
    }

    equalizer.onmousemove = function() {
      sound.seek(equalizer.cursor)
    }

    equalizer.onmouseup = function() {
      sound.resume()
    }

    sound.equalizer = equalizer

    // Update cursor
    function update() {
      window.requestAnimationFrame(update)
      if (sound.source && sound.source.buffer) {
        equalizer.cursor = sound.currentTime / sound.source.buffer.duration
      }
    }

    update()
  }

  sound.load = function(arraybuffer) {
    var scope = this
    ctx.decodeAudioData(arraybuffer, function(buf) {
      scope.buffer = buf
      alert('[Sound] Ready to play')
      // notify('[!!] Ready to play')
    }, function(err) {
      console.log('Oh oh! Something failed :(')
      throw err
    })
  }

  sound.loadReverb = function(arraybuffer) {
    var scope = this
    ctx.decodeAudioData(arraybuffer, function(buf) {
      scope.reverbbuffer = buf
      alert('[Reverb] Ready to play')
      // notify('[!!] Ready to play')
    }, function(err) {
      console.log('Oh oh! Something failed :(')
      throw err
    })
  }


  sound.prepareMaster = function() {
    /**
     * Create buffer source
     */
    this.source = ctx.createBufferSource()
    this.source.buffer = this.buffer
    this.source.loop = loop

    /**
     * Create a analyser node
     * [MDN] It is an AudioNode that passes the audio stream unchanged from the input to the output,
     * but allows you to take the generated data, process it, and create audio visualizations.
     */
    this.analyser = ctx.createAnalyser()
    this.analyser.smoothingTimeConstant = 0.8
    this.analyser.fftSize = 256

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
    var scope = this
    this.processor = ctx.createScriptProcessor(1024, 1, 1)
    this.processor.onaudioprocess = function() {
      scope.currentTime = scope.source.context.currentTime - scope.startTime
      scope.currentTime = Math.min(scope.currentTime, scope.buffer.duration)
      if (scope.equalizer) scope.analyser.getFloatTimeDomainData(scope.equalizer.data)
    }


    /**
     * Volume node
     */
    this.gain = ctx.createGain()

    /**
     * Compressor
     */
    this.compressor = ctx.createDynamicsCompressor()
  }

  sound.connectReverb = function() {

    /**
     *
     *    ConvolverGain
     *          |
     *       Convolver
     *          |
     *        Gain
     *          |
     *     DESTINATION
     *
     */

    this.convolver = ctx.createConvolver()
    this.convolver.buffer = this.reverbbuffer
    this.convolver.normalize = true
    this.convolver.loop = loop

    this.convolverGain = ctx.createGain()
    this.convolverGain.gain.value = 0

    this.convolverGain
    .connect(this.convolver)
    .connect(this.gain)

    this.source.connect(this.convolverGain)
  }

  sound.connectEqualizer = function() {

    /**
     *
     *                 SOURCE
     *                   |
     *     ——————————————|—————————————
     *     |             |            |
     *     |             |            |
     *   hBand –––—      |      –––— lBand
     *     |      |      |      |     |
     *     |   hInvert   |   lInvert  |
     *     |      |      |      |     |
     *     |      ———— mBand ——––     |
     *     |             |            |
     *   hGain         mGain        lGain
     *     |             |            |
     *     |             |            |
     *     ———————————  Gain  —————————
     *                   |
     *              DESTINATION
     *
     */

    this.hBand = ctx.createBiquadFilter()
    this.hBand.type = 'lowshelf'
    this.hBand.frequency.value = 360
    this.hBand.gain.value = -40.0

    this.hInvert = ctx.createGain()
    this.hInvert.gain.value = -1.0

    this.lBand = ctx.createBiquadFilter()
    this.lBand.type = 'highshelf'
    this.lBand.frequency.value = 3600
    this.lBand.gain.value = -40.0

    this.lInvert = ctx.createGain()
    this.lInvert.gain.value = -1.0

    this.mBand = ctx.createBiquadFilter()

    this.source.connect(this.lBand)
    this.source.connect(this.mBand)
    this.source.connect(this.hBand)

    this.hBand.connect(this.hInvert)
    this.lBand.connect(this.lInvert)

    this.hInvert.connect(this.mBand)
    this.lInvert.connect(this.mBand)

    this.hGain = ctx.createGain()
    this.hGain.gain.value = 1
    this.mGain = ctx.createGain()
    this.mGain.gain.value = 1
    this.lGain = ctx.createGain()
    this.lGain.gain.value = 1

    this.hBand.connect(this.hGain)
    this.mBand.connect(this.mGain)
    this.lBand.connect(this.lGain)

    this.hGain.connect(this.gain)
    this.mGain.connect(this.gain)
    this.lGain.connect(this.gain)
  }

  sound.connect = function() {
    this.prepareMaster()
    this.connectReverb()
    this.connectEqualizer()

    /**
     *
     *       Gain
     *         |
     *     Compressor
     *         |
     *     DESTINATION
     *
     */
    this.gain
    .connect(this.compressor)
    .connect(ctx.destination)

    /**
     * Analysis
     *
     *     Compressor
     *         |
     *      Analyser
     *         |
     *     Processor
     *         |
     *     DESTINATION
     *
     */
    this.compressor
    .connect(this.analyser)
    .connect(this.processor)
    .connect(ctx.destination)

    /**
     * Set previous values
     */
    this.volume(this._volume)
    this.reverb(this._reverb)
    this.playbackRate(this._playbackRate)

    this.EQGains(this._hGain, this._mGain, this._lGain)
  }

  sound.disconnect = function() {
    this.processor.onaudioprocess = null

    this.source.disconnect(0)
    this.gain.disconnect(0)
    this.processor.disconnect(0)
    this.analyser.disconnect(0)
    this.convolver.disconnect(0)
    this.convolverGain.disconnect(0)

    this.source        = null
    this.gain          = null
    this.processor     = null
    this.analyser      = null
    this.convolver     = null
    this.convolverGain = null
  }

  sound.play = function() {
    if (!this.paused) return
    this.paused = false

    this.connect()
    this.time = 0
    this.startTime = this.source.context.currentTime
    this.source.start(this.startTime, this.time)
  }

  sound.pause = function() {
    if (this.paused) return
    this.paused = true

    this.time = this.source.context.currentTime - this.startTime
    this.source.stop(0)
    this.disconnect()
    this.source = null
  }

  sound.resume = function() {
    if (!this.paused) return
    this.paused = false
    this.connect()

    this.startTime = this.source.context.currentTime - this.time
    this.source.start(this.source.context.currentTime, this.time)
  }

  sound.stop = function() {
    if (this.paused) return
    this.paused = true

    time = 0
    this.source.stop(0)
    this.disconnect()
    this.source = null
  }

  sound.volume = function(value) {
    this.gain.gain.value = value
    this._volume = value
  }

  sound.reverb = function(value) {
    this.convolverGain.gain.value = value
    this._reverb = value
  }

  sound.seek = function(cursor) {
    this.time = cursor * this.buffer.duration
  }

  sound.playbackRate = function(value) {
    this.source.playbackRate.value = value
    this._playbackRate = value
  }

  sound.EQGains = function(hGain, mGain, lGain) {
    this.hGain.gain.value = hGain
    this.mGain.gain.value = mGain
    this.lGain.gain.value = lGain
    this._hGain = hGain
    this._mGain = mGain
    this._lGain = lGain
  }

  setup()

})()