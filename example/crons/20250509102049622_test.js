const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Demo Job
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(1000)
}

export const schedule = '* * * * * *'
export const duration = 1000
export const actions = [demoAction]
export const disabled = false
// export const env = 'production'
