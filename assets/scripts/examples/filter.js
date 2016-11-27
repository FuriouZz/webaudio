(function() {

  /**
   * Filter
   */
  var $el     = document.getElementById('filter-example')
  var $canvas = $el.querySelector('canvas')

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer($canvas, size, 100, 0.1, true)

  var audioElement, filter

  _.createAudioElement('./assets/audio/looking-glass.wav').then(function($audio) {
    audioElement = $audio
    $el.appendChild(audioElement)

    connect()
    listeners()

    audioElement.play()
    equalizer.start()

    function update() {
      window.requestAnimationFrame(update)
      equalizer.cursor = audioElement.currentTime / audioElement.duration
    }
    update()

  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })

  var connect = function() {
    var mediaElementSource = ctx.createMediaElementSource(audioElement)

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
     * Add filter
     */
    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'

    /**
     * Analyse data from source
     *
     * INPUT -> ANALYSER (only fetch input data) -> OUTPUT
     */
    mediaElementSource.connect(filter)
                      .connect(analyser)
                      .connect(processor)
                      .connect(ctx.destination)

    /**
     * Get sound
     *
     * INPUT -> OUTPUT
     */
    mediaElementSource.connect(filter)
                      .connect(ctx.destination)
  }

  var listeners = function() {

    var $div = document.createElement('div')
    $el.appendChild($div)

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
      $div.appendChild(input)
    }

    var frequency = document.createElement('input')
    frequency.type  = 'range'
    frequency.min   = 0
    frequency.max   = 1000
    frequency.value = 500
    frequency.addEventListener('mousemove', function() {
      filter.frequency.value = parseFloat(this.value)
    })

    var label = document.createElement('label')
    label.innerHTML = '<span>Frequency:</span>'
    label.appendChild(frequency)
    $div.appendChild(label)
  }

})()