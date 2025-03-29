import mongoose from "mongoose";

const { Schema } = mongoose;

const categoryCostsSchema = new Schema({
  modelWalk: {
    type: Number,
    required: [true, "Fashion Designer cost is required"],
    min: [0, "Cost cannot be negative"],
    default: 5000,
  },
  dance: {
    type: Number,
    required: [true, "Dance Selection cost is required"],
    min: [0, "Cost cannot be negative"],
    default: 5000,
  },
  movieSelection: {
    type: Number,
    required: [true, "Movie Selection cost is required"],
    min: [0, "Cost cannot be negative"],
    default: 5000,
  },
}, { timestamps: true });

// Use a single document approach since we only need one set of costs
categoryCostsSchema.statics.updateCosts = async function(costs) {
  const doc = await this.findOne();
  if (doc) {
    return this.findOneAndUpdate({}, costs, { new: true });
  }
  return this.create(costs);
};

export default mongoose.models.CategoryCosts || mongoose.model("CategoryCosts", categoryCostsSchema);