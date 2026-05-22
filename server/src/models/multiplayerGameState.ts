import mongoose, { Schema, Types } from "mongoose";
import { dayResultsSchema, type DayResults } from "./dayResults";

export interface MultiplayerGameState {
  creatorId: string;
  playerIds: string[];
  results: DayResults[];
  session: Types.ObjectId;
  groupCode: string;
  ranking: string[];
  npcSeed: number;
  createdAt: Date;
  updatedAt: Date;
}

const multiplayerGameStateSchema = new Schema<MultiplayerGameState>(
  {
    creatorId: {
      type: String,
      required: true,
      trim: true,
    },

    playerIds: {
      type: [String],
      required: true,
      default: [],
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

    groupCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    ranking: {
      type: [String],
      required: true,
      default: [],
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

export const MultiplayerGameStateModel =
  mongoose.model<MultiplayerGameState>(
    "MultiplayerGameState",
    multiplayerGameStateSchema
  );
