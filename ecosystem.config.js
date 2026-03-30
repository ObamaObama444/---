module.exports = {
  apps: [
    {
      name: "open-room-public",
      script: "scripts/public.js",
      env: {
        PORT: 8000,
      },
    },
  ],
};
