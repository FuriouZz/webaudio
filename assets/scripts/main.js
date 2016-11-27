window.addEventListener('DOMContentLoaded', function() {

  var EXAMPLES = [
    "audio-element",
    "buffer-source",
    "audio-stream",
    "spatial",
    "filter"
  ]

  var html = '<option>-</option>'

  for (var i in EXAMPLES) {
    html += '<option value="'+EXAMPLES[i]+'">'
    html += EXAMPLES[i]
    html += '</option>'
  }

  var select = document.createElement('select')
  select.id = 'example-selector'
  select.innerHTML = html
  select.addEventListener('change', function() {
    window.location.href = window.location.origin + '?' + this.value
  })

  document.body.appendChild(select)

  var key = window.location.search.replace('?', '')
  if (EXAMPLES.indexOf(key) !== -1) {
    document.querySelector('#'+key+'-example').classList.remove('hidden')
    var script = document.createElement('script')
    script.src = './assets/scripts/examples/'+key+'.js'
    document.body.appendChild(script)
  }

})