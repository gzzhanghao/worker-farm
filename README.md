# WorkerFarm

Yet another worker-farm. Check out [node-worker-farm](https://github.com/rvagg/node-worker-farm) for production usage.

__WARNING: This package is under heavy development and should be considered unstable, use it at your own risk__

## Usage

Install the worker farm with:

```bash
npm i -S @gzzhanghao/worker-farm
```

Then you should be able to import the worker farm:

```javascript
const createFarm = require('@gzzhanghao/worker-farm').default
```

## API

### `createFarm(modulePath: string, opts: Object): WorkerFarm`

Create a worker farm with `modulePath` and `options`. The `modulePath` should be an absolute path to the the module that runs in workers.

Available options are:

```javascript
{
  maxConcurrentWorkers : require('os').cpus().length,
  maxConcurrentCalls   : Infinity,
  maxCallTime          : Infinity,
  maxRetries           : Infinity,
  autoStart            : true,
}
```

Check out `node-worker-farm`'s [documentation](https://github.com/rvagg/node-worker-farm#options) for more details.

### `workerFarm.fillUp(): void`

Fill up the worker farm with workers. It will keep adding workers to the worker farm until there are `options.maxConcurrentWorkers` workers in the farm.

### `workerFarm.addWorker(): void`

Add a worker to the worker farm. Throws if there are already `options.maxConcurrentWorkers` workers in the farm.

### `workerFarm.layoff(): void`

Dismiss an idle worker, or dismiss the next worker that finished its task if all workers are busy at the moment.

### `workerFarm.run(args = [], method = null): Promise&lt;any&gt;`

Run a task with the worker farm. The worker farm will invoke the `method` function exported by the module specified by the `modulePath`. If `method` is not specified, it will invoke the method exported by `module.exports` instead.

### `close(): void`

Close the farm once it finished all pending tasks.

### `destroy(): void`

Destroy the worker farm immediately. This method will reject all unfinished tasks.

## Example

```javascript
'use strict'

const babel = require('babel-core')

module.exports = (content, opts) => {
  try {
    // or return a Promise for async tasks
    return babel.transform(content, opts).code
  } catch (error) {
    // values should be able JSON-serializable
    throw { message: error.message, stack: error.stack }
  }
}
```
