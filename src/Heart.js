import EventEmitter from 'events'

const hearts = []
setInterval(() => hearts.forEach(heart => heart.attack()), 1000).unref()

export default class Heart extends EventEmitter {

  constructor(maxHP) {
    super()
    hearts.push(this)

    this.maxHP = maxHP
    this.healthPoint = this.maxHP
  }

  beat() {
    this.healthPoint = this.maxHP
  }

  attack() {
    this.healthPoint -= 1
    if (!this.healthPoint) {
      this.emit('timeout')
    }
  }

  close() {
    hearts.splice(hearts.indexOf(this), 1)
  }
}
