export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};
