window._ = {

  load: function(url, responseType) {
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest
      request.open('GET', url, true)
      request.responseType = responseType || ''

      request.onload = function() {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.response)
        } else {
          reject({
            status: request.status,
            error: request.statusText
          })
        }
      }

      request.onerror = function() {
        reject({
          status: request.status,
          error: request.statusText
        })
      }

      request.send()
    })
  },

  createAudioBuffer: function(url) {
    return this.load(url, 'arraybuffer')
  },

  createAudioElement: function(url) {
    return new Promise(function(resolve, reject) {
      var mediaElement = new Audio
      mediaElement.src = url
      mediaElement.controls = true
      mediaElement.oncanplaythrough = function() {
        resolve(mediaElement)
      }
      mediaElement.onerror = function(e) {
        reject(e)
      }
    })
  },

  createAudioStream: function(options) {
    return new Promise(function(resolve, reject) {
      navigator.getUserMedia(
        options,

        // On success
        function(mediaStream) {
          window.URL = window.URL || window.webkitURL
          resolve(mediaStream, URL.createObjectURL(mediaStream))
        },

        // On fail
        function() {
          reject()
        }
      )
    })
  },

  createCanvas: function() {
    var paused = true
    var ptime  = 0
    var delta  = 0

    var $canvas = document.createElement( 'canvas' )
    var context = $canvas.getContext( '2d' )

    var xport = {
      $canvas: $canvas,
      context: context,

      onrender: null,

      start: function() {
        paused = false
        window.requestAnimationFrame(render)
      },

      stop: function() {
        paused = true
        window.cancelAnimationFrame(render)
      }
    }

    var render = function(time) {
      if (paused) return
      window.requestAnimationFrame(render)

      delta = time - ptime
      ptime = time

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, $canvas.width, $canvas.height)

      if (xport.onrender) xport.onrender(delta, time)
    }

    return xport
  },

  createEqualizer: function(size, updateFrequency, smooth, mirror) {
    var time = 0
    var frequencies    = new Float32Array(size)
    var newFrequencies = new Float32Array(size)
    var canvas = _.createCanvas()
    canvas.$canvas.className = 'equalizer'
    canvas.$canvas.width     = size - 1
    canvas.$canvas.height    = 100
    document.body.appendChild(canvas.$canvas)

    canvas.onrender = function(delta) {
      time += delta

      if (time > updateFrequency) {
        time = 0
        newFrequencies = xport.data.slice(0)
      }

      canvas.context.fillStyle = 'red'

      for (var i = 0, len = frequencies.length; i < len; i++) {
        frequencies[i] += (newFrequencies[i] - frequencies[i]) * smooth
        canvas.context.translate(0, canvas.$canvas.height * 0.5)
        if (mirror) canvas.context.fillRect(i * 2, 0, 1, frequencies[i] * 100)
        canvas.context.scale(1, -1)
        canvas.context.fillRect(i * 2, 0, 1, frequencies[i] * 100)
        canvas.context.setTransform(1, 0, 0, 1, 0, 0)
      }
    }

    var xport = {
      canvas: canvas,
      start: canvas.start.bind(canvas),
      stop: canvas.stop.bind(canvas),
      data: new Float32Array(size)
    }

    return xport

  },

  createSpatialCanvas: function(panner, listener) {
    var canvas = _.createCanvas()
    canvas.$canvas.className = 'spatial'
    canvas.$canvas.width  = 400
    canvas.$canvas.height = 400
    document.body.appendChild(canvas.$canvas)

    var boundingRect = { top: 0, left: 0 }
    var mouse        = [200, 200]
    var size         = 10

    canvas.onrender = function() {
      var ctx = canvas.context

      listener.setPosition(mouse[0], mouse[1], 0)
      panner.setPosition(200, 200, 0)

      ctx.fillStyle = 'green'
      ctx.translate(200, 200)
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'red'
      ctx.setTransform(1, 0, 0, 1, mouse[0], mouse[1])
      ctx.fillRect(size * -0.5, size * -0.5, size, size)
    }

    canvas.$canvas.addEventListener('mouseenter', function() {
      boundingRect = canvas.$canvas.getBoundingClientRect()
    })

    canvas.$canvas.addEventListener('mousemove', function(e) {
      mouse[0] = e.clientX - boundingRect.left
      mouse[1] = e.clientY - boundingRect.top
    })

    var xport = {
      canvas: canvas,
      start: canvas.start.bind(canvas),
      stop: canvas.stop.bind(canvas)
    }

    return xport
  }

}