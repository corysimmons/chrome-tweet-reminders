export interface Reminder {
  id: string;
  tweetUrl: string;
  tweetId: string;
  tweetText: string;
  authorHandle: string;
  reminderTime: number;
  createdAt: number;
}

export interface TweetData {
  tweetUrl: string | null;
  tweetId: string | null;
  tweetText: string;
  authorHandle: string;
}

export type MessageType =
  | { type: "ADD_REMINDER"; reminder: Reminder }
  | { type: "GET_REMINDERS" }
  | { type: "DELETE_REMINDER"; id: string }
  | { type: "GET_REMINDERS_FOR_TWEET"; tweetId: string }
  | { type: "CHECK_NOW" }
  | { type: "EXPORT_REMINDERS" }
  | { type: "IMPORT_REMINDERS"; reminders: Reminder[] };
