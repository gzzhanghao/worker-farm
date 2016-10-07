import os from 'os'
import EventEmitter from 'events'

import TaskWorker from './TaskWorker'

const defaultOpts = {
  maxConcurrentWorkers : os.cpus().length,
  maxConcurrentCalls   : Infinity,
  maxCallTime          : Infinity,
  maxRetries           : Infinity,
  autoStart            : true,
}

export default class WorkerFarm extends EventEmitter {

  constructor(modulePath, opts) {
    super()

    this.modulePath = modulePath
    this.opts = Object.assign({}, defaultOpts, opts)

    this.layoffs = 0
    this.tasks = []
    this.workers = []

    if (this.opts.autoStart) {
      this.fillUp()
    }
  }

  /**
   * Fill up the farm with workers
   */
  fillUp() {
    for (let i = this.workers.length; i < this.opts.maxConcurrentWorkers; i++) {
      this.addWorker()
    }
  }

  /**
   * Add a worker to the farm
   */
  addWorker() {
    if (this.workers.length >= this.opts.maxConcurrentWorkers) {
      throw new Error(`Too many concurrent workers (${this.workers.length})`)
    }
    if (this.closing) {
      throw new Error('The farm is closing')
    }

    const worker = new TaskWorker(this.modulePath, this.opts)
      .on('idle', () => this._onIdle(worker))
      .on('workerError', error => this._onWorkerError(error, worker))
      .on('disconnect', lastTask => this._onDisconnect(lastTask, worker))
      .once('leave', () => this._onLeave(worker))

    this.workers.push(worker)
    this.emit('workerAdd', worker)
  }

  /**
   * Dismiss an idle worker
   */
  layoff() {
    const idleWorkers = this.workers.filter(w => !w.currentTask)

    if (idleWorkers.length) {
      idleWorkers[0].dismiss()
    } else {
      this.layoffs += 1
    }
  }

  /**
   * Run a task
   */
  run(args = [], method = null) {
    if (this.closing) {
      return Promise.reject(new Error('The farm is closing'))
    }
    const concurrentCalls = this.workers.filter(w => w.currentTask).length + this.tasks.length
    if (concurrentCalls > this.opts.maxConcurrentCalls) {
      return Promise.reject(new Error(`Too many concurrent calls (${concurrentCalls})`))
    }
    return new Promise((resolve, reject) => {
      this._runTask({ args, method, resolve, reject, retries: 0 })
    })
  }

  /**
   * Close the farm once all tasks finished
   */
  close() {
    const idleWorkers = this.workers.filter(w => !w.currentTask)

    this.closing = true

    for (const worker of idleWorkers) {
      worker.dismiss()
    }
  }

  /**
   * Destroy the farm immediately
   */
  destroy() {
    this.closing = true

    for (const worker of this.workers) {
      worker.dismiss()
    }
  }

  /**
   * A producer - consumer problem
   */

  _runTask(task) {
    const idleWorkers = this.workers.filter(w => !w.busy)
    if (idleWorkers.length) {
      idleWorkers[0].run(task)
    } else {
      this.tasks.push(task)
    }
  }

  _onIdle(worker) {
    const task = this.tasks.shift()

    if (this.layoffs) {
      worker.dismiss()
      this.layoffs -= 1
      return
    }

    if (task) {
      worker.run(task)
      return
    }

    if (this.closing) {
      worker.dismiss()
    }
  }

  /**
   * On worker disconnected
   */
  _onDisconnect(task) {
    if (!task) {
      return
    }
    task.retries += 1
    if (task.retries > this.opts.maxRetries) {
      return task.reject(new Error(`Cancel after ${task.retries} retries`))
    }
    this.emit('retry', task)
    this._runTask(task)
  }

  /**
   * Forward worker's error
   */
  _onWorkerError(error, worker) {
    this.emit('workerError', error, worker)
  }

  /**
   * Worker gone away
   */
  _onLeave(worker) {
    this.workers.splice(this.workers.indexOf(worker), 1)
    this.emit('workerLeave', worker)
    if (!this.workers.length) {
      this.emit('close')
    }
  }
}
