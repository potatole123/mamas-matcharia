import mongoose, { Schema } from "mongoose";

export interface Image {
  imageId: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<Image>(
  {
    imageId: {
      type: Number,
      required: true,
      unique: true,
    },

    path: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ImageModel = mongoose.model<Image>("Image", imageSchema);
