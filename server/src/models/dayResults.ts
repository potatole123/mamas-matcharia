import { Schema, Types } from "mongoose";

export interface DayResults {
  orderScores: Types.ObjectId[];
}

export const dayResultsSchema = new Schema<DayResults>(
  {
    orderScores: {
      type: [Schema.Types.ObjectId],
      ref: "OrderScore",
      required: true,
      default: [],
    },
  },
  {
    _id: false,
  }
);
