import mongoose, { mongo, Schema } from "mongoose";

const ShowSchema = new Schema({
    movie:{type:String,required:true,ref:'Movie'},
    showDateTime:{type:Date,required:true},
    showPrice:{type:Number,required:true},
    occupiedSeats:{type:Object,default:{}}
},{minimize:false})

const Show = mongoose.model("Show",ShowSchema)
export default Show;