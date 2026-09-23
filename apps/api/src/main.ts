import "dotenv/config";
import { createApp } from "./bootstrap/create-app";

void createApp()
  .then((app) => app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0"))
  .catch(() => {
    console.error(
      "API startup failed. Check server configuration and persistent storage.",
    );
    process.exitCode = 1;
  });
