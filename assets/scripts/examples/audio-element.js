(function() {

  /**
   * Audio Element example
   */

  var $el     = document.getElementById('audio-element-example')
  var $canvas = $el.querySelector('canvas')

  var ctx       = new AudioContext
  var size      = 256
  var equalizer = _.createEqualizer($canvas, size, 100, 0.1, true)

  var audioElement

  _.createAudioElement('./assets/audio/looking-glass.wav').then(function($audio) {
    audioElement = $audio

    connect()

    $el.appendChild(audioElement)
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
     * Analyse data from source
     *
     * INPUT -> ANALYSER (only fetch input data) -> OUTPUT
     */
    mediaElementSource.connect(analyser)
                      .connect(processor)
                      .connect(ctx.destination)

    /**
     * Get sound
     *
     * INPUT -> OUTPUT
     */
    mediaElementSource.connect(ctx.destination)
  }

})()