semo-plugin-cron
------------------------

A Semo plugin to provide simple cron job.

## Usage

```
$ npm install semo-plugin-cron
$ semo generate cron
$ semo cron
```

You need to add related settigns for cron working in .semorc.yml

```
cronDir: 
cronMakeDir:
```

You can implement hook_cron_redis to provide a redis lock and unlock, so you can run cron job in multiple instances.

```js
// In your project Semo hook file: hooks/index


import { redis } from 'semo-plugin-redis'
const redisInstance = await redis.load('redisKey')

// Redis锁，加锁
const lock = async function(redisKey: string, redisValue: any, timeout: number) {
  return await redisInstance.eval(
    'return redis.call("set", KEYS[1], ARGV[1], "NX", "PX", ARGV[2])',
    1,
    redisKey,
    redisValue,
    timeout
  )
}

// Redis锁，解锁
const unlock = async function(redisKey: string, redisValue: any) {
  return await redisInstance.eval(
    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
    1,
    redisKey,
    redisValue
  )
}

const hook_cron_redis = () => {
  return { lock, unlock }
}
```

Sometimes, we use Semo cron with Semo scripts and Semo commands, so the main logic will be in scripts and commands not in cron job file, it's up to you to choose how to use Semo cron.

You can generate cron job template by Semo generators command:

```
semo generate cron YOUR_CRON_JOB_NAME
```

Then you can get code template like this, depends on whether you use typescript or not:

```js
// Pure ES version
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// 示例 Job Actions
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(1000)
}

exports.schedule = '* * * * * *'
exports.duration = 1000
exports.actions = [demoAction]
exports.disabled = false
```

NOTE: Here `actions` is an array, so it means you can set multiple different purpose actions in one job, and the `action` can be a shell command, that is useful in some cases.

The format for shell command action should be in array style:

```js
...
exports.actions = [['ls', '-l']]
...
```

Maybe you want to use string style shell command, it works only for simple command without string options with blanks.

```js
...
exports.actions = [['ls -l']] // work
exports.actions = [['grep "a b c"']] // not work
...
```

## License

MIT