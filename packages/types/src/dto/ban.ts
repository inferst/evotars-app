export type BanEntity = {
  userId: string;
  // Timeout duration in seconds, undefined for a permanent ban.
  duration?: number;
};
