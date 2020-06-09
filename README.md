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

Sometime, we use Semo cron with Semo scripts and Semo commands, so the main logic will be in scripts and commands not in cron job file, it's up to you to choose how to use Semo cron.