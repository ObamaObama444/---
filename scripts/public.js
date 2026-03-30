const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const port = Number(process.env.PORT) || 8000;
const serverPath = path.join(__dirname, "..", "server.js");

let tunnelProcess;
let serverProcess;
let shuttingDown = false;
let announcedUrl = false;
let tunnelOutputBuffer = "";

bootstrap().catch(async (error) => {
  console.error("\nFailed to start public forum:");
  console.error(error.message || error);
  await shutdown(1);
});

async function bootstrap() {
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ["inherit", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  serverProcess.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  serverProcess.on("exit", async (code) => {
    if (!shuttingDown) {
      console.error(`\nForum server stopped with code ${code ?? "unknown"}.`);
      await shutdown(code ?? 1);
    }
  });

  await waitForServer(port);

  tunnelProcess = spawn(
    "ssh",
    [
      "-T",
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "ServerAliveInterval=30",
      "-R",
      `80:localhost:${port}`,
      "nokey@localhost.run",
    ],
    {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  tunnelProcess.stdout.on("data", (chunk) => {
    handleTunnelOutput(chunk.toString("utf8"));
  });

  tunnelProcess.stderr.on("data", (chunk) => {
    handleTunnelOutput(chunk.toString("utf8"));
  });

  tunnelProcess.on("exit", async (code) => {
    if (!shuttingDown) {
      console.error(`\nPublic tunnel stopped with code ${code ?? "unknown"}.`);
      await shutdown(code ?? 1);
    }
  });
}

function handleTunnelOutput(text) {
  tunnelOutputBuffer += text;

  const lines = tunnelOutputBuffer.split(/\r?\n/);
  tunnelOutputBuffer = lines.pop() || "";

  for (const line of lines) {
    const match = line.match(/tunneled.*(https:\/\/[a-z0-9.-]+)/i);

    if (match && !announcedUrl) {
      announcedUrl = true;
      console.log("\nForum is public now:");
      console.log(`Local:  http://localhost:${port}`);
      console.log(`Public: ${match[1]}`);
      console.log("\nKeep this terminal open while the forum should stay online.");
      return;
    }
  }

  if (/channel \d+: open failed|ssh: connect to host|could not resolve hostname/i.test(text)) {
    process.stderr.write(text);
  }
}

function waitForServer(targetPort) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const request = http.get(
        {
          hostname: "127.0.0.1",
          port: targetPort,
          path: "/api/health",
          timeout: 1000,
        },
        (response) => {
          response.resume();

          if (response.statusCode && response.statusCode < 500) {
            resolve();
            return;
          }

          retry();
        }
      );

      request.on("error", retry);
      request.on("timeout", () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > 15000) {
        reject(new Error("Forum server did not start within 15 seconds."));
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });
}

async function shutdown(code = 0) {
  shuttingDown = true;

  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGINT");
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGINT");
  }

  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", async () => {
  await shutdown(0);
});

process.on("SIGTERM", async () => {
  await shutdown(0);
});
