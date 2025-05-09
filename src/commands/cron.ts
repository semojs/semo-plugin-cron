import {
  ArgvExtraOptions,
  colorize,
  debugChannel,
  error,
  info,
  Utils,
} from '@semo/core'
import cProcess from 'child_process'
import { globSync } from 'glob'
import _ from 'lodash'
import { createRequire } from 'module'
import cron from 'node-cron'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const debug = debugChannel('semo-plugin-cron')
const spawnSync = cProcess.spawnSync

const DEFAULT_EXPIRE_MILLISECONDS = 60000

// 执行器
const shell = {
  // 执行单条系统命令
  exec: async function (action: any, initInfo: any) {
    try {
      if (typeof action === 'string') {
        debug(`Action: [${action}] executed!`)
        const parts = action.split(/\s+/g)
        spawnSync(parts[0], parts.slice(1), {
          stdio: [process.stdin, process.stdout, process.stderr],
        })
      } else if (_.isArray(action)) {
        let args
        const command = action[0]
        if (_.isArray(action[1])) {
          args = action[1]
        } else {
          args = action.slice(1)
        }

        debug('execute', `Action: [${command} ${args.join(' ')}] executed!`)
        spawnSync(command, args, {
          stdio: [process.stdin, process.stdout, process.stderr],
        })
      } else if (typeof action === 'function') {
        const name = action.name ? action.name : 'function'
        debug('execute', `Action: [${name}] executed!`)
        await action(initInfo)
      }
    } catch (e) {
      debug(e.stack)
    }
  },

  // 执行多条系统命令
  series: async function (actions: any, initInfo: any) {
    const loops = actions.concat()
    const execNext: any = async function () {
      await shell.exec(loops.shift(), initInfo)
      if (loops.length > 0) {
        await execNext()
      }
    }
    await execNext()
  },
}

export const command = 'cron [job]'
export const desc = `Semo cron system`

export const builder = function (yargs: any) {
  yargs.option('list', { desc: 'Just list all crons.', alias: ['L', 'ls'] })
}

export const handler = async function (argv: ArgvExtraOptions) {
  if (!argv.cronDir || !fs.existsSync(argv.cronDir)) {
    error('"cronDir" missing in config file or not exist in current directory!')

    return
  }

  const config = argv.$core.appConfig
  try {
    // 通过 Hook 进行初始化动作
    const initInfo = await argv.$core.invokeHook('cron:setup')

    // run specific job for testing, ignore disabled property
    if (argv.job) {
      if (fs.existsSync(path.resolve(process.cwd(), argv.job))) {
        const jobModule = require(path.resolve(process.cwd(), argv.job))
        if (jobModule && jobModule.actions && _.isArray(jobModule.actions)) {
          await shell.series(jobModule.actions, initInfo)
          process.exit(0)
        } else {
          error('Job not valid')
          return
        }
      } else {
        error('Job not found')
        return
      }
    }

    const jobs: { [propName: string]: any } = {}
    globSync('*.js', {
      cwd: path.resolve(process.cwd(), config.cronDir),
    }).map(function (job) {
      jobs[job] = require(path.resolve(process.cwd(), config.cronDir, job))
    })

    if (argv.list) {
      const header = ['Cron', 'Status'].map((item) =>
        colorize('green.bold', item)
      )
      const rows = [header]
      const jobKeys = Object.keys(jobs)
      if (jobKeys.length > 0) {
        jobKeys.forEach((job) => {
          rows.push([job, jobs[job].disabled ? 'Disabled' : 'Enabled'])
        })

        Utils.outputTable(rows)
        return
      } else {
        info(
          `No cron jobs found, you can use ${colorize('green', 'semo generate cron')} to generate a cron template file.`
        )
        return
      }
    }

    const { lock, unlock } = (await argv.$core.invokeHook(
      'cron:redis_lock'
    )) as { lock: (key, value, duration) => {}; unlock: (key, value) => {} }

    // 注册计划任务
    if (Object.keys(jobs).length > 0) {
      Object.keys(jobs).forEach((key) => {
        if (jobs[key].disabled) return // ignore disabled job
        if (jobs[key].env && jobs[key].env !== argv.$core.getNodeEnv()) return // ignore if env not match
        cron.schedule(jobs[key].schedule, function () {
          debug(
            'schedule',
            `${new Date().toLocaleString()} - JOB: [${key}] started!`
          )
          ;(async () => {
            if (lock && unlock) {
              const redisKey = `${config.name}:cronjob:${key}`
              const redisValue = Math.random()

              const ok = await lock(
                redisKey,
                redisValue,
                jobs[key].duration
                  ? jobs[key].duration
                  : DEFAULT_EXPIRE_MILLISECONDS
              )
              if (ok) {
                await shell.series(jobs[key].actions, initInfo)
                await unlock(redisKey, redisValue)
              } else {
                debug('lock acquire failed.')
              }
            } else {
              await shell.series(jobs[key].actions, initInfo)
            }
          })()
        })
      })
    } else {
      error('No enabled cronjob found')
    }
  } catch (e) {
    if (argv.verbose) {
      error(e.stack)
    } else {
      error(e.message)
    }
  }
}
