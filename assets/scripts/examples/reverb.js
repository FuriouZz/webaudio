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
    _playbackRate: 1
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
      alert('Ready to play')
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
      alert('Ready to play')
      // notify('[!!] Ready to play')
    }, function(err) {
      console.log('Oh oh! Something failed :(')
      throw err
    })
  }


  sound.connectMaster = function() {
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

    /**
     * Connects
     */
    this.source
    .connect(this.gain)
    .connect(this.analyser)
    .connect(this.processor)
    .connect(ctx.destination)

    this.source
    .connect(this.gain)
    .connect(this.compressor)
    .connect(ctx.destination)
  }

  sound.connectReverb = function() {
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

  sound.connect = function() {
    this.connectMaster()
    this.connectReverb()

    this.volume(this._volume)
    this.reverb(this._reverb)
    this.playbackRate(this._playbackRate)
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

  setup()





    // /**
    //  * Play
    //  */
    // function play() {
    //   if (!buffer) return
    //   if (playing) return
    //   playing = true

    //   connect()
    //   time = 0
    //   startTime = bufferSource.context.currentTime
    //   bufferSource.startTime = startTime
    //   bufferSource.start(bufferSource.context.currentTime, time)
    // }


    // /**
    //  * Resume
    //  */
    // function resume() {
    //   if (!buffer) return
    //   if (playing) return
    //   playing = true

    //   connect()
    //   startTime = bufferSource.context.currentTime - time
    //   bufferSource.startTime = startTime
    //   bufferSource.start(bufferSource.context.currentTime, time)
    // }
















  // var bufferSource, buffer, gain, convolverGain, playbackRate = 1, convolverNormalize = 0

  // var $notify = document.createElement('div')
  // $notify.style.cssText = 'font-size: 12px; text-transform: uppercase; font-weight: bold; color: #1c1c69'
  // $el.appendChild($notify)

  // _.createAudioBuffer('./assets/audio/walk.wav').then(function(arrayBuffer) {
  //   ctx.decodeAudioData(arrayBuffer, function(buf) {
  //     buffer = buf
  //   }, function() {
  //     console.log('Oh oh! Decoding failed :(')
  //   })
  // }).catch(function(err) {
  //   console.log('Oh oh! Something failed :(')
  //   throw err
  // })

  // var setup = function() {

  //   // Make connection
  //   listeners()

  //   // Start equalizer
  //   equalizer.start()

  //   // Update cursor
  //   function update() {
  //     window.requestAnimationFrame(update)
  //     if (bufferSource && bufferSource.buffer) {
  //       equalizer.cursor = bufferSource.currentTime / bufferSource.buffer.duration
  //     }
  //   }

  //   update()

  //   // File upload
  //   var reader = new FileReader
  //   var input  = document.createElement('input')
  //   input.type = "file"
  //   input.name = "files[]"
  //   input.setAttribute('multiple', true)
  //   input.addEventListener('change', function(e) {
  //     reader.onload = function(e) {
  //       ctx.decodeAudioData(reader.result, function(buf) {
  //         buffer = buf
  //         notify('[!!] Ready to play')
  //       }, function(err) {
  //         console.log('Oh oh! Something failed :(')
  //         throw err
  //       })
  //     }
  //     reader.readAsArrayBuffer(e.currentTarget.files[0])
  //   })
  //   $el.appendChild(input)

  // }

  // var notify = function(message) {
  //   $notify.innerHTML = message
  //   setTimeout(function() {
  //     $notify.innerHTML = ''
  //   }, 2000)
  // }

  // var connect = function() {
  //   bufferSource = ctx.createBufferSource()
  //   bufferSource.buffer = buffer
  //   bufferSource.startTime = bufferSource.context.currentTime
  //   bufferSource.currentTime = 0
  //   bufferSource.playbackRate.value = playbackRate

  //   /**
  //    * Create a analyser node
  //    * [MDN] It is an AudioNode that passes the audio stream unchanged from the input to the output,
  //    * but allows you to take the generated data, process it, and create audio visualizations.
  //    */
  //   var analyser = ctx.createAnalyser()
  //   analyser.smoothingTimeConstant = 0.8
  //   analyser.fftSize = size

  //   /**
  //    * A script processing is an interface used for direct audio processing.
  //    *
  //    * @param {Number} bufferSize
  //    * Must be a power of 2 value : 256, 512, 1024, 2048, 4096, 8192, 16384.
  //    * This value controls how frequently the audioprocess event is dispatched
  //    * and how many sample-frames need to be processed each call.
  //    * Lower is the value better is the latency.
  //    *
  //    * @param {Number} numberInputChannel
  //    * @param {Number} numberOutputChannel
  //    */
  //   var processor = ctx.createScriptProcessor(1024, 1, 1)
  //   processor.onaudioprocess = function() {
  //     if (!bufferSource) {
  //       processor.onaudioprocess = null
  //       processor.disconnect(0)
  //       analyser.disconnect(0)
  //       return
  //     }

  //     bufferSource.currentTime = bufferSource.context.currentTime - bufferSource.startTime
  //     bufferSource.currentTime = Math.min(bufferSource.currentTime, bufferSource.buffer.duration)
  //     analyser.getFloatTimeDomainData(equalizer.data)
  //   }


  //   /**
  //    * Volume node
  //    */
  //   gain = ctx.createGain()

  //   /**
  //    * Analyse data from source
  //    *
  //    * INPUT -> Gain -> ANALYSER (only fetch input data) -> OUTPUT
  //    */
  //   bufferSource
  //               .connect(gain)
  //               .connect(analyser)
  //               .connect(processor)
  //               .connect(ctx.destination)

  //   /**
  //    * Get sound
  //    *
  //    * INPUT -> Gain -> OUTPUT
  //    */
  //   bufferSource
  //               .connect(convolver)
  //               .connect(gain)
  //               .connect(ctx.destination)
  // }

  // var connectConvolver = function() {

  // }

  // var listeners = function() {

  //   var inputsArray = [
  //     'play', 'resume', 'pause', 'stop', 'volume', 'playbackRate', 'reverb'
  //   ]

  //   var inputs = {}

  //   var startTime    = 0
  //   var time         = 0
  //   var playing      = false

  //   var $div = document.createElement('div')
  //   $el.appendChild($div)


  //   /**
  //    * Play
  //    */
  //   function play() {
  //     if (!buffer) return
  //     if (playing) return
  //     playing = true

  //     connect()
  //     time = 0
  //     startTime = bufferSource.context.currentTime
  //     bufferSource.startTime = startTime
  //     bufferSource.start(bufferSource.context.currentTime, time)
  //   }


  //   /**
  //    * Resume
  //    */
  //   function resume() {
  //     if (!buffer) return
  //     if (playing) return
  //     playing = true

  //     connect()
  //     startTime = bufferSource.context.currentTime - time
  //     bufferSource.startTime = startTime
  //     bufferSource.start(bufferSource.context.currentTime, time)
  //   }


  //   /**
  //    * Pause
  //    */
  //   function pause() {
  //     if (!buffer) return
  //     if (!playing) return
  //     playing = false

  //     time = bufferSource.context.currentTime - startTime
  //     bufferSource.stop(0)
  //     bufferSource.disconnect(0)
  //     bufferSource = null
  //   }


  //   /**
  //    * Stop
  //    */
  //   function stop() {
  //     if (!buffer) return
  //     if (!playing) return
  //     playing = false

  //     time = 0
  //     bufferSource.stop(0)
  //     bufferSource.disconnect(0)
  //     convolver.disconnect(0)
  //     bufferSource = null
  //   }

  //   function seek() {
  //     equalizer.onmousedown = function() {
  //       pause()
  //       time = equalizer.cursor * buffer.duration
  //     }

  //     equalizer.onmousemove = function() {
  //       time = equalizer.cursor * buffer.duration
  //     }

  //     equalizer.onmouseup = function() {
  //       resume()
  //     }
  //   }

  //   seek()

  //   /**
  //    * Setup
  //    */
  //   var input

  //   for (var i = 0; i < inputsArray.length; i++) {

  //     if (inputsArray[i] === 'volume') {
  //       var volumeElement = document.createElement('span')

  //       input       = document.createElement('input')
  //       input.type  = 'range'
  //       input.value = 1
  //       input.min   = 0
  //       input.max   = 1
  //       input.step  = 0.01
  //       input.addEventListener('mousemove', function() {
  //         if (gain) {
  //           gain.gain.value = parseFloat(this.value)
  //           volumeElement.innerHTML = this.value
  //         }
  //       })

  //       var label = document.createElement('label')
  //       label.innerHTML = '<br>Volume: '
  //       label.appendChild(volumeElement)
  //       label.appendChild(document.createElement('br'))
  //       label.appendChild(input)
  //       input = label
  //     } else if (inputsArray[i] === 'reverb') {
  //       var convolverElement = document.createElement('span')

  //       input       = document.createElement('input')
  //       input.type  = 'range'
  //       input.value = 1
  //       input.min   = 0
  //       input.max   = 1
  //       input.step  = 0.01
  //       input.addEventListener('mousemove', function() {
  //         if (convolver) {
  //           console.log(convolver.normalize)
  //           // convolver.normalize.value = convolverNormalize
  //           // gain.normalize.value = parseFloat(this.value)
  //           convolverElement.innerHTML = this.value
  //         }
  //       })

  //       var label = document.createElement('label')
  //       label.innerHTML = '<br>Reverb: '
  //       label.appendChild(convolverElement)
  //       label.appendChild(document.createElement('br'))
  //       label.appendChild(input)
  //       input = label
  //     } else if (inputsArray[i] === 'playbackRate') {
  //       var playbackRateElement = document.createElement('span')

  //       input       = document.createElement('input')
  //       input.type  = 'range'
  //       input.value = 0
  //       input.min   = -1
  //       input.max   = 1
  //       input.step  = 0.001
  //       input.style.width = '500px'
  //       input.addEventListener('mousemove', function() {
  //         if (bufferSource) {
  //           var value = parseFloat(this.value)

  //           if (value < 0) {
  //             value = 1 - Math.abs(value)
  //           } else {
  //             value = 1 + value * 10
  //           }

  //           playbackRate = value
  //           bufferSource.playbackRate.value = value
  //           playbackRateElement.innerHTML = value
  //         }
  //       })

  //       var label = document.createElement('label')
  //       label.innerHTML = '<br>Playback Rate (between 0.01 and 10, default: 1): '
  //       label.appendChild(playbackRateElement)
  //       label.appendChild(document.createElement('br'))
  //       label.appendChild(input)
  //       input = label
  //     } else {
  //       input       = document.createElement('input')
  //       input.type  = 'button'
  //       input.value = inputsArray[i]

  //       input.addEventListener('click', function() {
  //         if      (this.value === 'play'  ) { play()   }
  //         else if (this.value === 'resume') { resume() }
  //         else if (this.value === 'pause' ) { pause()  }
  //         else                              { stop()   }
  //       })
  //     }

  //     $div.appendChild(input)
  //   }

  // }

  // setup()

})()