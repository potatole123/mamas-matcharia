import mongoose, { Schema } from "mongoose";
import {
  CREAM_TOP,
  CUP_SIZE,
  FLAVOR,
  ICE_LEVEL,
  MATCHA,
  MILK,
  POWDER,
  SWEETENER,
  SWEETNESS_LEVEL,
  TEMP,
  type CreamTop,
  type CupSize,
  type Flavor,
  type IceLevel,
  type Matcha,
  type Milk,
  type Powder,
  type Sweetener,
  type SweetnessLevel,
  type Temp,
} from "../types/enums";

export interface Recipe {
  recipeId: string;
  cupSize: CupSize;
  temp: Temp;
  iceLevel: IceLevel;
  matcha: Matcha;
  milk: Milk;
  flavor: Flavor;
  sweetener: Sweetener;
  sweetnessLevel: SweetnessLevel;
  creamTop: CreamTop;
  powder: Powder;
  createdAt: Date;
  updatedAt: Date;
}

const recipeSchema = new Schema<Recipe>(
  {
    recipeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    cupSize: {
      type: String,
      enum: CUP_SIZE,
      required: true,
    },

    temp: {
      type: String,
      enum: TEMP,
      required: true,
    },

    iceLevel: {
      type: String,
      enum: ICE_LEVEL,
      required: true,
    },

    matcha: {
      type: String,
      enum: MATCHA,
      required: true,
    },

    milk: {
      type: String,
      enum: MILK,
      required: true,
    },

    flavor: {
      type: String,
      enum: FLAVOR,
      required: true,
    },

    sweetener: {
      type: String,
      enum: SWEETENER,
      required: true,
    },

    sweetnessLevel: {
      type: String,
      enum: SWEETNESS_LEVEL,
      required: true,
    },

    creamTop: {
      type: String,
      enum: CREAM_TOP,
      required: true,
    },

    powder: {
      type: String,
      enum: POWDER,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RecipeModel = mongoose.model<Recipe>("Recipe", recipeSchema);
