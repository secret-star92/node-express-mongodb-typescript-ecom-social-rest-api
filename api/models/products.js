/** @format */

// Import the mongoose module from node_modules
const mongoose = require("mongoose");

// Defining a Model and Creating a Database Schema
// define product schema
const productSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: String,
	price: Number,
});

// Export model
// Compile model from schema
module.exports = mongoose.model("Product", productSchema);