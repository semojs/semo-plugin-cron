export = (Utils) => {
  const hook_hook = new Utils.Hook('semo', {
    setup: 'Setup deps and env for cron.',
    redis_lock: 'Define lock and unlock for concurrent cron instances.'
  })
  return { hook_hook}
}