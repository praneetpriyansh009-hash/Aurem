module.exports = {
    apps: [
        {
            name: 'aurem-api-cluster',
            script: 'index.js',
            instances: 'max', // Utilizes all available CPU cores
            exec_mode: 'cluster', // Enables Node.js cluster mode for load balancing
            autorestart: true,
            watch: false,
            max_memory_restart: '1G', // Prevents memory leaks from crashing the server
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};
