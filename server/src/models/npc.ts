import mongoose, { Schema, Types } from "mongoose";

export interface NPC {
  npcId: number;
  order: Types.ObjectId;
  enterTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const npcSchema = new Schema<NPC>(
  {
    npcId: {
      type: Number,
      required: true,
      unique: true,
    },

    order: {
      type: Schema.Types.ObjectId,
      ref: "CustomerOrder",
      required: true,
    },

    enterTime: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const NPCModel = mongoose.model<NPC>("NPC", npcSchema);
