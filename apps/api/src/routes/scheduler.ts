import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { schedulerService } from "../services/schedulerService.js";

const schedulerRoutes: FastifyPluginAsync = async (fastify) => {
  // 스케줄 목록 조회
  fastify.get(
    "/scheduler/schedules",
    {
      schema: {
        tags: ["Scheduler"],
        summary: "Get all crawling schedules",
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String(),
                name: Type.String(),
                pattern: Type.String(),
                isActive: Type.Boolean(),
                lastRun: Type.Optional(Type.String({ format: "date-time" })),
                nextRun: Type.Optional(Type.String({ format: "date-time" })),
                productIds: Type.Optional(Type.Array(Type.Number())),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const schedules = schedulerService.getAllSchedules();

      return {
        success: true,
        data: schedules,
      };
    }
  );

  // 스케줄 토글 (활성화/비활성화)
  fastify.patch(
    "/scheduler/schedules/:id/toggle",
    {
      schema: {
        tags: ["Scheduler"],
        summary: "Toggle schedule active status",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              id: Type.String(),
              isActive: Type.Boolean(),
            }),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const schedule = schedulerService.getSchedule(id);

      if (!schedule) {
        reply.status(404);
        return {
          success: false,
          error: "Not Found",
          message: "Schedule not found",
        };
      }

      schedulerService.toggleSchedule(id);
      const updatedSchedule = schedulerService.getSchedule(id);

      return {
        success: true,
        message: `Schedule ${updatedSchedule?.isActive ? "activated" : "deactivated"}`,
        data: {
          id,
          isActive: updatedSchedule?.isActive || false,
        },
      };
    }
  );

  // 새 스케줄 추가
  fastify.post(
    "/scheduler/schedules",
    {
      schema: {
        tags: ["Scheduler"],
        summary: "Create new crawling schedule",
        body: Type.Object({
          id: Type.String(),
          name: Type.String(),
          pattern: Type.String(),
          productIds: Type.Optional(Type.Array(Type.Number())),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              id: Type.String(),
              name: Type.String(),
              pattern: Type.String(),
              isActive: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id, name, pattern, productIds, isActive = true } = request.body;

      const config = {
        id,
        name,
        pattern,
        productIds,
        isActive,
      };

      schedulerService.addSchedule(config);

      reply.status(201);
      return {
        success: true,
        message: "Schedule created successfully",
        data: {
          id,
          name,
          pattern,
          isActive,
        },
      };
    }
  );

  // 스케줄 삭제
  fastify.delete(
    "/scheduler/schedules/:id",
    {
      schema: {
        tags: ["Scheduler"],
        summary: "Delete crawling schedule",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const schedule = schedulerService.getSchedule(id);

      if (!schedule) {
        reply.status(404);
        return {
          success: false,
          error: "Not Found",
          message: "Schedule not found",
        };
      }

      schedulerService.removeSchedule(id);

      return {
        success: true,
        message: "Schedule deleted successfully",
      };
    }
  );

  // 즉시 실행
  fastify.post(
    "/scheduler/schedules/:id/run",
    {
      schema: {
        tags: ["Scheduler"],
        summary: "Execute schedule immediately",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const schedule = schedulerService.getSchedule(id);

      if (!schedule) {
        reply.status(404);
        return {
          success: false,
          error: "Not Found",
          message: "Schedule not found",
        };
      }

      // TODO: 즉시 실행 로직 구현
      fastify.log.info(
        { scheduleId: id },
        "Manual schedule execution requested"
      );

      return {
        success: true,
        message: "Schedule execution started",
      };
    }
  );
};

export default schedulerRoutes;
