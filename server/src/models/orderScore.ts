import mongoose, { Schema, Types } from "mongoose";

export interface OrderScore {
  order: Types.ObjectId;
  waitingScore: number;
  accuracyScore: number;
  measurementScore: number;
  toppingScore: number;
  totalScore: number;
  tipsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderScoreSchema = new Schema<OrderScore>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "CustomerOrder",
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

export const OrderScoreModel = mongoose.model<OrderScore>(
  "OrderScore",
  orderScoreSchema
);
