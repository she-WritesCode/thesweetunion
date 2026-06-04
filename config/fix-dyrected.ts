import path from 'node:path'

export default (nitroApp: any) => {
  // @ts-ignore
  const config = useRuntimeConfig()
  if (config.dyrected) {
    const cwd = process.cwd()
    config.dyrected.configPath = path.resolve(cwd, 'dyrected.config.ts')
    config.dyrected.loadConfigPath = path.resolve(cwd, 'node_modules/@dyrected/nuxt/dist/runtime/server/plugins/loadConfig.mjs')
  }
}
