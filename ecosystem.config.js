module.exports = {
  apps: [
    {
      name: 'epikom-hub',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/epikom-hub',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      log_file: '/var/log/pm2/epikom-hub.log',
      error_file: '/var/log/pm2/epikom-hub-error.log',
      out_file: '/var/log/pm2/epikom-hub-out.log',
      // Restart policy
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      // Watch (disabled in production)
      watch: false,
    },
  ],
};
