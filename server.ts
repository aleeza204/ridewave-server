import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
// Railway (and some other hosts) have no outbound IPv6 route, but Node's
// default DNS ordering can still hand back an IPv6 address for a dual-stack
// host like smtp.gmail.com, causing ENETUNREACH. Force IPv4-first globally
// so this doesn't just affect nodemailer but every outbound connection.
dns.setDefaultResultOrder("ipv4first");

import http from "http";
import { app } from "./app";

// Real-time ride events (ride requests, accept/reject, location relay) are
// handled by the standalone websocket relay in `socket/server.js`, not here.
const PORT = Number(process.env.PORT) || 8000;

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});