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

export interface RecipeSet {
  cupSizeSet: CupSize[];
  tempSet: Temp[];
  iceLevelSet: IceLevel[];
  matchaSet: Matcha[];
  milkSet: Milk[];
  flavorSet: Flavor[];
  sweetenerSet: Sweetener[];
  sweetnessLevelSet: SweetnessLevel[];
  creamTopSet: CreamTop[];
  powderSet: Powder[];
  createdAt: Date;
  updatedAt: Date;
}

const hasUniqueValues = (values: string[]) => new Set(values).size === values.length;

const recipeSetSchema = new Schema<RecipeSet>(
  {
    cupSizeSet: {
      type: [String],
      enum: CUP_SIZE,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    tempSet: {
      type: [String],
      enum: TEMP,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    iceLevelSet: {
      type: [String],
      enum: ICE_LEVEL,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    matchaSet: {
      type: [String],
      enum: MATCHA,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    milkSet: {
      type: [String],
      enum: MILK,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    flavorSet: {
      type: [String],
      enum: FLAVOR,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    sweetenerSet: {
      type: [String],
      enum: SWEETENER,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    sweetnessLevelSet: {
      type: [String],
      enum: SWEETNESS_LEVEL,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    creamTopSet: {
      type: [String],
      enum: CREAM_TOP,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },

    powderSet: {
      type: [String],
      enum: POWDER,
      required: true,
      default: [],
      validate: hasUniqueValues,
    },
  },
  {
    timestamps: true,
  }
);

export const RecipeSetModel = mongoose.model<RecipeSet>(
  "RecipeSet",
  recipeSetSchema
);
