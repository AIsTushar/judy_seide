module.exports = {
    apps: [
        {
            name: 'ruebzj-server',
            script: './dist/server.js',
            args: 'start',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
