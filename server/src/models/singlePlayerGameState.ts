import mongoose, { Schema, Types } from "mongoose";
import { dayResultsSchema, type DayResults } from "./dayResults";

export interface SinglePlayerGameState {
  playerId: string;
  results: DayResults[];
  session: Types.ObjectId;
  npcSeed: number;
  createdAt: Date;
  updatedAt: Date;
}

const singlePlayerGameStateSchema = new Schema<SinglePlayerGameState>(
  {
    playerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    results: {
      type: [dayResultsSchema],
      required: true,
      default: [],
    },

    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    npcSeed: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SinglePlayerGameStateModel =
  mongoose.model<SinglePlayerGameState>(
    "SinglePlayerGameState",
    singlePlayerGameStateSchema
  );
