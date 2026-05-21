import mongoose, { Schema, Types } from "mongoose";
import { STATUS, type Status } from "../types/enums";

export interface CustomerOrder {
  orderId: number;
  recipe: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  expirationTime: Date;
  status: Status;
}

const customerOrderSchema = new Schema<CustomerOrder>(
  {
    orderId: {
      type: Number,
      required: true,
      unique: true,
    },

    recipe: {
      type: Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },

    expirationTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: STATUS,
      required: true,
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerOrderModel = mongoose.model<CustomerOrder>(
  "CustomerOrder",
  customerOrderSchema
);
