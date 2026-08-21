import axios from "axios";

interface ApiErrorEnvelope {
  message?: string;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: ApiErrorEnvelope;
}

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError(error)) return fallback;
  const data: ApiErrorBody | undefined = error.response?.data;
  const envelope: ApiErrorEnvelope | undefined = data?.error;
  if (typeof envelope?.message === "string" && envelope.message.length > 0) {
    return envelope.message;
  }
  if (typeof data?.message === "string" && data.message.length > 0) {
    return data.message;
  }
  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message.join("；");
  }
  return fallback;
};
