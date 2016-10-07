import WorkerFarm from './WorkerFarm'

export default function(modulePath, opts) {
  return new WorkerFarm(modulePath, opts)
}