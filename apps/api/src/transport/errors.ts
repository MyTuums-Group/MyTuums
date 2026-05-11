import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";

export type RestErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type TransportErrorDescriptor = {
  trpcCode: TRPC_ERROR_CODE_KEY;
  httpStatus: number;
  publicCode: string;
  message: string;
};

export function toTRPCError(error: TransportErrorDescriptor): TRPCError {
  return new TRPCError({
    code: error.trpcCode,
    message: error.message,
  });
}

export function toRestError(error: TransportErrorDescriptor): {
  statusCode: number;
  body: RestErrorBody;
} {
  return {
    statusCode: error.httpStatus,
    body: {
      error: {
        code: error.publicCode,
        message: error.message,
      },
    },
  };
}
