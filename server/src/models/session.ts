import mongoose, { Schema, Types } from "mongoose";

export type ActiveGameModel = "SinglePlayerGameState" | "MultiplayerGameState";

export interface Session {
  profile: Types.ObjectId;
  activeGame?: Types.ObjectId | null;
  activeGameModel?: ActiveGameModel | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<Session>(
  {
    profile: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      unique: true,
    },

    activeGame: {
      type: Schema.Types.ObjectId,
      refPath: "activeGameModel",
      default: null,
    },

    activeGameModel: {
      type: String,
      enum: ["SinglePlayerGameState", "MultiplayerGameState"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const SessionModel = mongoose.model<Session>("Session", sessionSchema);
