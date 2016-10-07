let instance = null
let heart = null

const handlers = {

  init({ timeout, module }) {
    clearInterval(heart)
    if (Number.isFinite(timeout)) {
      heart = setInterval(() => process.send({ type: 'heartbeat' }), timeout >> 1)
    }
    instance = require(module)
    process.send({ type: 'ready' })
  },

  run({ method, args }) {
    Promise.resolve().then(() => {
      if (!method) {
        return instance.apply(this, args)
      }
      return instance[method].apply(instance, args)
    }).then(result => {
      process.send({ type: 'result', result })
    }, error => {
      process.send({ type: 'error', error })
    })
  },
}

process.on('message', msg => handlers[msg.type](msg))
