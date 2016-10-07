import cp from 'child_process'
import EventEmitter from 'events'

/**
 * A worker that re-spawn automatically
 *
 * ** Heroes never die **
 *
 * __Events__
 *
 * - 'spawn'       Emitted when the hero spawns a new worker
 * - 'leave'       Emitted after the hero dismissed
 * - 'message'     Emitted when the hero receives a message
 * - 'disconnect'  Emitted when child process disconnected
 * - 'workerError' Redirects child process's error events
 */

export default class HeroWorker extends EventEmitter {

  constructor(workerPath) {
    super()

    this.workerPath = workerPath

    this._onError = this._onError.bind(this)
    this._onMessage = this._onMessage.bind(this)
    this._onDisconnect = this._onDisconnect.bind(this)
  }

  /**
   * Fork a worker instance
   */
  start() {
    const worker = cp.fork(this.workerPath)

    worker.on('error', this._onError)
    worker.on('message', this._onMessage)
    worker.on('disconnect', this._onDisconnect)

    this.worker = worker
    this.emit('spawn')
  }

  /**
   * Send a message to current worker
   */
  send(msg) {
    this.worker.send(msg)
  }

  /**
   * Kill the hero, it will reborn if not dismissed
   */
  kill(sig) {
    this.worker.kill(sig)
  }

  /**
   * Heroes never die, but they can be dismissed
   */
  dismiss() {
    this.dismissed = true
    this._removeListeners()
    this.kill()

    if (this.worker.disconnected) {
      this.emit('leave')
    } else {
      this.worker.once('disconnect', () => this.emit('leave'))
    }
  }

  _removeListeners() {
    this.worker.removeListener('error', this._onError)
    this.worker.removeListener('message', this._onMessage)
    this.worker.removeListener('disconnect', this._onDisconnect)
  }

  _onMessage(msg) {
    this.emit('message', msg)
  }

  _onError(error) {
    this.emit('workerError', error)
    this.kill()
  }

  _onDisconnect() {
    this.emit('disconnect')
    this._removeListeners()

    if (!this.dismissed) {
      this.start()
    }
  }
}
