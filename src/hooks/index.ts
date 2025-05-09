export const hook_hook = {
  semo: () => {
    return {
      setup: 'Setup deps and env for cron.',
      redis_lock: 'Define lock and unlock for concurrent cron instances.',
    }
  },
}
