import mongoose, { Schema, Types } from "mongoose";

export interface Profile {
  userId: string;
  displayName: string;
  coinBalance: number;
  highestDayUnlocked: number;
  tutorialCompleted: boolean;
  recipeSet?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<Profile>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    coinBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    highestDayUnlocked: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    tutorialCompleted: {
      type: Boolean,
      required: true,
      default: false,
    },

    recipeSet: {
      type: Schema.Types.ObjectId,
      ref: "RecipeSet",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ProfileModel = mongoose.model<Profile>("Profile", profileSchema);
