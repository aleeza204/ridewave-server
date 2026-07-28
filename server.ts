import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { app } from "./app";

// Real-time ride events (ride requests, accept/reject, location relay) are
// handled by the standalone websocket relay in `socket/server.js`, not here.
const PORT = Number(process.env.PORT) || 8000;

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});