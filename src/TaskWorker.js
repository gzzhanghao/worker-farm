import EventEmitter from 'events'

import Heart from './Heart'
import HeroWorker from './HeroWorker'

/**
 *
 */

export default class TaskWorker extends EventEmitter {

  constructor(modulePath, opts) {
    super()

    this.opts = opts
    this.modulePath = modulePath

    this.busy = true
    this.currentTask = null

    this.heart = new Heart(this.opts.maxCallTime)
    this.heart.on('timeout', () => this._onTimeout())

    this.worker = new HeroWorker(require.resolve('./Slave'))
      .on('spawn', () => this._onSpawn())
      .on('message', msg => this._onMessage(msg))
      .on('disconnect', () => this._onDisconnect())
      .on('workerError', error => this._onError(error))
      .once('leave', () => this._onLeave())

    this.worker.start()
  }

  run(task) {
    return new Promise((resolve, reject) => {
      this.busy = true
      this.currentTask = task
      this.worker.send({ type: 'run', method: task.method, args: task.args })
    })
  }

  dismiss() {
    this.worker.dismiss()
  }

  /**
   * Initialize the new worker
   */
  _onSpawn() {
    this.worker.send({ type: 'init', module: this.modulePath, timeout: this.opts.maxCallTime })
    this.heart.beat()
  }

  /**
   * Kill the lost worker
   */
  _onTimeout() {
    this.emit('workerError', new Error('Worker heartbeat timeout'))
    this.worker.kill()
  }

  /**
   * Worker ready to work
   */
  _onIdle() {
    this.busy = false
    this.currentTask = null
    this.emit('idle')
  }

  /**
   * Worker disconnected
   */
  _onDisconnect() {
    const currentTask = this.currentTask

    this.busy = true
    this.currentTask = null

    this.emit('disconnect', currentTask)
  }

  /**
   * Worker gone away
   */
  _onLeave() {
    this.heart.close()
    this.emit('leave')
  }

  /**
   * Forward worker's error
   */
  _onError(error) {
    this.emit('workerError', error)
  }

  /**
   * Receive message from worker
   */
  _onMessage(msg) {
    this.heart.beat()

    switch (msg.type) {

      case 'ready':
        this._onIdle()
        break

      case 'result':
        this.currentTask.resolve(msg.result)
        this._onIdle()
        break

      case 'error':
        this.currentTask.reject(msg.error)
        this._onIdle()
        break
    }
  }
}
