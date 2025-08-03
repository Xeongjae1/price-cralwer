import type { FastifyPluginAsync } from "fastify";

const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/ws",
    {
      websocket: true,
      schema: {
        tags: ["WebSocket"],
        summary: "WebSocket connection for real-time updates",
      },
    },
    (connection, req) => {
      fastify.log.info("WebSocket connection established");

      // 연결 확인 메시지 전송
      connection.socket.send(
        JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          message: "WebSocket connection established",
        })
      );

      connection.socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.info({ data }, "WebSocket message received");

          // Echo back with timestamp
          connection.socket.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
              received: data,
            })
          );
        } catch (error) {
          fastify.log.error({ error }, "WebSocket message parsing error");
          connection.socket.send(
            JSON.stringify({
              type: "error",
              timestamp: new Date().toISOString(),
              message: "Invalid message format",
            })
          );
        }
      });

      connection.socket.on("close", () => {
        fastify.log.info("WebSocket connection closed");
      });

      connection.socket.on("error", (error) => {
        fastify.log.error({ error }, "WebSocket error");
      });
    }
  );
};

export default websocketRoutes;
