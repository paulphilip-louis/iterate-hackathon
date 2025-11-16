import * as z from "zod";

//===----------------------------------------------------------------------===//
// Events that chrome extension sends
//===----------------------------------------------------------------------===//

export const candidateInfoSchema = z.object({
  event: z.literal("CANDIDATE_INFOS"),
  payload: z.object({
    CANDIDATES_LINKEDIN: z.string(),
    JOB_DESCRIPTION: z.string(),
    COMPANY_VALUES: z.string(),
  }),
});

export const transcriptChunkSchema = z.object({
  event: z.literal("TRANSCRIPT_CHUNK"),
  payload: z.string(),
});

//===----------------------------------------------------------------------===//
// Events that chrome extension receives
//===----------------------------------------------------------------------===//

// Specific event schemas
// Support both formats: with type field and without, with payload as object or string
export const newSuggestedQuestionSchema = z.union([
  z.object({
    type: z.literal("event").optional(),
    event: z.literal("NEW_SUGGESTED_QUESTION"),
    payload: z.object({
      question: z.string(),
    }),
  }),
  z.object({
    event: z.literal("NEW_SUGGESTED_QUESTION"),
    payload: z.string(), // Direct string payload from question generation service
  }),
]);

export const startingQuestionSchema = z.union([
  z.object({
    event: z.literal("STARTING_QUESTIONS"),
    payload: z.string(), // JSON string from question generation service
  }),
  z.object({
    event: z.literal("STARTING_QUESTIONS"),
    payload: z.object({
      questions: z.array(z.string()),
    }),
  }),
]);

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
// Use union instead of discriminatedUnion to support flexible formats
export const meetingEventSchema = z.union([
  newSuggestedQuestionSchema,
  startingQuestionSchema,
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

//===----------------------------------------------------------------------===//