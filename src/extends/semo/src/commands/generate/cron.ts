import { Argv, ArgvExtraOptions, error, success } from '@semo/core'
import day from 'dayjs'
import { ensureDirSync } from 'fs-extra'
import _ from 'lodash'
import fs from 'node:fs'
import path from 'node:path'

export const command = 'cron <name>'
export const desc = 'Generate a cron job file'

export const builder = function (yargs: Argv) {
  yargs.option('typescript', {
    alias: 'ts',
    describe: 'generate typescript style code',
    type: 'boolean',
  })

  yargs.option('format', {
    choices: ['esm', 'cjs', 'typescript'],
    type: 'string',
  })
}

export const handler = function (argv: ArgvExtraOptions) {
  // argv.typescript = argv.$core.getPluginConfig('typescript', false)
  if (argv.typescript && !argv.format) {
    argv.format = 'typescript'
  }

  const cronDir = argv.cronMakeDir || argv.cronDir
  if (!cronDir) {
    error('"cronDir" missing in config file!')
    return
  }

  ensureDirSync(cronDir)

  const filePrefix = day().format('YYYYMMDDHHmmssSSS')
  const cronFile = path.resolve(
    cronDir,
    `${filePrefix}_${_.kebabCase(argv.name)}.${argv.format === 'typescript' ? 'ts' : 'js'}`
  )
  if (fs.existsSync(cronFile)) {
    error('Script file exist!')
    return
  }

  let code
  switch (argv.format) {
    case 'typescript':
      code = `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Demo Job
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(1000)
}

export const schedule = '* * * * * *'
export const duration = 1000
export const actions = [demoAction]
export const disabled = false
export const env = 'production'
`
      break
    case 'esm':
      code = `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Demo Job
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(1000)
}

export const schedule = '* * * * * *'
export const duration = 1000
export const actions = [demoAction]
export const disabled = false
export const env = 'production'
`
      break
    case 'cjs':
      code = `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Demo Job
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(1000)
}

exports.schedule = '* * * * * *'
exports.duration = 1000
exports.actions = [demoAction]
exports.disabled = false
`
      break
  }

  if (!fs.existsSync(cronFile)) {
    fs.writeFileSync(cronFile, code)
    success(`${cronFile} created!`)
  }
}
