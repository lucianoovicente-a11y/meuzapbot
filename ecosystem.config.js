module.exports = {
  apps: [
    {
      name: 'kbot-api',
      script: 'src/backend/index.js',
      cwd: './',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'kbot-engine',
      script: 'src/engine/index.js',
      cwd: './',
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'kbot-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './src/frontend',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
