import * as z from "zod";

// Specific event schemas
export const newSuggestedQuestionSchema = z.object({
  type: z.literal("event"),
  event: z.literal("NEW_SUGGESTED_QUESTION"),
  payload: z.object({
    question: z.string(),
  }),
});

export const greenFlagSchema = z.object({
  type: z.literal("event"),
  event: z.literal("GREEN_FLAG"),
  payload: z.object({
    message: z.string(),
  }),
});

export const redFlagSchema = z.object({
  type: z.literal("event"),
  event: z.literal("RED_FLAG"),
  payload: z.object({
    message: z.string(),
  }),
});

export const defineTermSchema = z.object({
  type: z.literal("event"),
  event: z.literal("DEFINE_TERM"),
  payload: z.object({
    term: z.string(),
    definition: z.string(),
  }),
});

export const todoCreatedSchema = z.object({
  type: z.literal("event"),
  event: z.literal("TODO_CREATED"),
  payload: z.object({
    todos: z.array(
      z.object({
        id: z.string(),
        message: z.string(),
      })
    ),
  }),
});

export const tickTodoSchema = z.object({
  type: z.literal("event"),
  event: z.literal("TICK_TODO"),
  payload: z.object({
    id: z.string(),
  }),
});

export const pdfGeneratedSchema = z.object({
  type: z.literal("event"),
  event: z.literal("PDF_GENERATED"),
  payload: z.object({
    filename: z.string(),
    pdfBytes: z.string(),
  }),
});

// Union of all event schemas
export const meetingEventSchema = z.discriminatedUnion("event", [
  newSuggestedQuestionSchema,
  greenFlagSchema,
  redFlagSchema,
  defineTermSchema,
  todoCreatedSchema,
  tickTodoSchema,
  pdfGeneratedSchema,
]);

// Type inference
export type MeetingEvent = z.infer<typeof meetingEventSchema>;
export type NewSuggestedQuestionEvent = z.infer<typeof newSuggestedQuestionSchema>;
export type GreenFlagEvent = z.infer<typeof greenFlagSchema>;
export type RedFlagEvent = z.infer<typeof redFlagSchema>;
export type DefineTermEvent = z.infer<typeof defineTermSchema>;
export type TodoCreatedEvent = z.infer<typeof todoCreatedSchema>;
export type TickTodoEvent = z.infer<typeof tickTodoSchema>;

