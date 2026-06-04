import { Schema } from "mongoose";

export interface DayResults {
  playerId?: string;
  playerDisplayName?: string;
  level: number;
  waitingScore: number;
  accuracyScore: number;
  measurementScore: number;
  toppingScore: number;
  totalScore: number;
  tipsEarned: number;
  passed: boolean;
  completedAt: Date;
}

export const dayResultsSchema = new Schema<DayResults>(
  {
    playerId: {
      type: String,
      trim: true,
    },

    playerDisplayName: {
      type: String,
      trim: true,
    },

    level: {
      type: Number,
      required: true,
      min: 1,
    },

    waitingScore: {
      type: Number,
      required: true,
      min: 0,
    },

    accuracyScore: {
      type: Number,
      required: true,
      min: 0,
    },

    measurementScore: {
      type: Number,
      required: true,
      min: 0,
    },

    toppingScore: {
      type: Number,
      required: true,
      min: 0,
    },

    totalScore: {
      type: Number,
      required: true,
      min: 0,
    },

    tipsEarned: {
      type: Number,
      required: true,
      min: 0,
    },

    passed: {
      type: Boolean,
      required: true,
    },

    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);
