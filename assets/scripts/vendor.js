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
        console.log(arguments)
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

  createCanvas: function($el) {
    var paused = true
    var ptime  = 0
    var delta  = 0

    $el = typeof $el === 'string' ? document.querySelector($el) : $el
    var $canvas = $el || document.createElement( 'canvas' )
    var ctx = $canvas.getContext( '2d' )

    var xport = {
      $canvas: $canvas,
      context: ctx,

      onrender: null,

      start: function() {
        paused = false
        window.requestAnimationFrame(render)
      },

      stop: function() {
        paused = true
        window.cancelAnimationFrame(render)
      },

      setSize: function(width, height, scale) {
        scale = scale || 1
        $canvas.width        = width * scale
        $canvas.height       = height * scale
        $canvas.style.width  = width+'px'
        $canvas.style.height = height+'px'
      }
    }

    var render = function(time) {
      if (paused) return
      window.requestAnimationFrame(render)

      delta = time - ptime
      ptime = time

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, $canvas.width, $canvas.height)

      if (xport.onrender) xport.onrender(delta, time)
    }

    return xport
  },

  createEqualizer: function($el, size, updateFrequency, smooth, mirror) {
    var time = 0
    var frequencies    = new Float32Array(size)
    var newFrequencies = new Float32Array(size)
    var canvas = _.createCanvas($el)
    canvas.setSize(size - 1, 100, window.devicePixelRatio)

    canvas.onrender = function(delta) {
      time += delta

      if (time > updateFrequency) {
        time = 0
        newFrequencies = xport.data.slice(0)
      }

      canvas.context.save()

      canvas.context.fillStyle = 'black'

      for (var i = 0, len = frequencies.length; i < len; i++) {
        frequencies[i] += (newFrequencies[i] - frequencies[i]) * smooth
        canvas.context.translate(0, canvas.$canvas.height * 0.5)
        if (mirror) canvas.context.fillRect(i * 2, 0, 1, frequencies[i] * 100)
        canvas.context.scale(1, -1)
        canvas.context.fillRect(i * 2, 0, 1, frequencies[i] * 100)
        canvas.context.setTransform(1, 0, 0, 1, 0, 0)
      }

      canvas.context.globalCompositeOperation = 'source-in'

      var gradient = canvas.context.createLinearGradient(0, 0, canvas.$canvas.width, 0)
      gradient.addColorStop(0, '#9fe705')
      gradient.addColorStop(xport.cursor, '#9fe705')
      gradient.addColorStop(xport.cursor, '#1c1c69')
      gradient.addColorStop(1, '#1c1c69')

      canvas.context.fillStyle = gradient
      canvas.context.fillRect(0, 0, canvas.$canvas.width, canvas.$canvas.height)


      canvas.context.restore()


    }

    var xport = {
      canvas: canvas,
      start: canvas.start.bind(canvas),
      stop: canvas.stop.bind(canvas),
      data: new Float32Array(size),
      cursor: 0
    }

    return xport

  }

}