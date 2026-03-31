module.exports = {
  apps: [
    {
      name: "open-room",
      script: "server.js",
      env: {
        PORT: 8000,
        HOST: "0.0.0.0",
      },
    },
  ],
};
