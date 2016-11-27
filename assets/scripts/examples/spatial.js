(function() {

  /**
   * Spatial example
   */
  var $el     = document.getElementById('spatial-example')
  var $canvas = $el.querySelector('canvas')

  var ctx = new AudioContext

  // Listener
  var listener = ctx.listener
  listener.setOrientation(0, 0, -1, 0, 1, 0)

  // Panner
  var panner            = ctx.createPanner()
  panner.coneInnerAngle = 360
  panner.coneOuterAngle = 0
  panner.coneOuterGain  = 0
  panner.distanceModel  = 'inverse'
  panner.panningModel   = 'HRTF'
  panner.refDistance    = 20
  panner.rolloffFactor  = 2
  panner.setOrientation(0, 0, 1)

  // Canvas
  var canvas

  _.createAudioElement('./assets/audio/walk.wav').then(function(audioElement) {
    createCanvas()

    var mediaElementSource = ctx.createMediaElementSource(audioElement)
    audioElement.loop = true
    $el.appendChild(audioElement)

    mediaElementSource.connect(panner)
                      .connect(ctx.destination)

    audioElement.play()

    canvas.start()
  }).catch(function(err) {
    console.log('Oh oh! Something failed :(')
    throw err
  })


  function createCanvas() {

    canvas = _.createCanvas($canvas)
    canvas.setSize(400, 400)
    $el.appendChild(canvas.$canvas)

    var boundingRect = { top: 0, left: 0 }
    var mouse        = [200, 200]
    var size         = 10
    var minSize      = 10
    var maxSize      = 50

    var direction = -1


    canvas.onrender = function(delta, time) {
      var ct = canvas.context

      size += direction * 0.5
      size  = Math.max(minSize, Math.min(size, maxSize))

      var t = ((size - minSize) / (maxSize - minSize)) * 2 - 1

      var x = Math.cos(time * 0.0005) * 50
      var y = Math.sin(time * 0.0005) * 100

      listener.setPosition(mouse[0], 0, mouse[1])
      panner.setPosition(200 + x, 0, 200 + y)

      ct.fillStyle = 'green'
      ct.translate(200, 200)

      ct.beginPath()
      ct.arc(x, y, 5, 0, Math.PI * 2)
      ct.closePath()
      ct.fill()

      ct.lineStyle = 'red'
      ct.beginPath()
      ct.arc(0, 0, panner.refDistance, 0, Math.PI * 2)
      ct.closePath()
      ct.stroke()

      ct.beginPath()
      ct.arc(0, 0, panner.maxDistance, 0, Math.PI * 2)
      ct.closePath()
      ct.stroke()

      ct.fillStyle = 'red'
      ct.setTransform(1, 0, 0, 1, mouse[0], mouse[1])
      ct.fillRect(size * -0.5, size * -0.5, size, size)
    }

    canvas.$canvas.addEventListener('mouseenter', function() {
      boundingRect = canvas.$canvas.getBoundingClientRect()
    })

    canvas.$canvas.addEventListener('mousemove', function(e) {
      // mouse[0] = e.clientX - boundingRect.left
      // mouse[1] = e.clientY - boundingRect.top
    })

    canvas.$canvas.addEventListener('mouseup', function(e) {
      direction = -1
    })

    canvas.$canvas.addEventListener('mousedown', function(e) {
      direction = 1
    })

  }

})()