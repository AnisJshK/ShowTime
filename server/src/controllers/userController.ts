import { clerkClient, getAuth } from "@clerk/express";
import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";


//API controller function to get user bookings
export const getUserBookings = async(req:Request,res:Response)=>{
    try {
        const user = getAuth(req).userId;
        const bookings = await Booking.find({user}).populate({
            path:"show",
            populate:{path:"movie"}
        }).sort({createdAt: -1})
        res.json({success:true,bookings})
    } catch (error:any) {
        console.error(error.message);
        res.json({success:false,message:error.message})
    }
}


// export const updateFavorite = async(req:Request,res:Response)=>{
//     try {
//         const {movieId} = req.body;
//         const userId = getAuth(req).userId;
//         if(!userId){
//             return res.status(402).json({message:"userId not found"})
//         }
//         const user = await clerkClient.users.getUser(userId)
//         ;
//        if(!user.privateMetadata.favorites){
//         user.privateMetadata.favorites = []
//        }
       
//        if(!user.privateMetadata.favorites.includes(movieId)){
//         user.privateMetadata.favorites.push(movieId)
//        }else{
//         user.privateMetadata.favorites = user.privateMetadata.favorites.filter(item => item!=movieId)
//        }
//        await clerkClient.users.updateUserMetadata(userId,{
//         privateMetadata:user.privateMetadata
//        })
//         res.json({success:true,message:"Favorite added successfully!"})
//     } catch (error:any) {
//         console.error(error.message);
//         res.json({success:false,message:error.message})
//     }
// }
//API controller function to update favorite Movie in clerk user metadata

export const updateFavorite = async(req:Request,res:Response)=>{
    try {
        const {movieId} = req.body;
        const userId = getAuth(req).userId;
        if(!userId){
            return res.status(402).json({message:"userId not found"})
        }
        const user = await clerkClient.users.getUser(userId)
        let favorites = ((user.privateMetadata.favorites as string[])||[]);
       if(!favorites.includes(movieId)){
        favorites.push(movieId);
       }else{
        favorites = favorites.filter(item => item!=movieId)
       }
       await clerkClient.users.updateUserMetadata(userId,{
        privateMetadata:{
            ...user.privateMetadata,
            favorites
        }
       })
        res.json({success:true,message:"Favorite added successfully!"})
    } catch (error:any) {
        console.error(error.message);
        res.json({success:false,message:error.message})
    }
}

export const getFavorites = async(req:Request,res:Response)=>{
    try {
        const userId = getAuth(req).userId;
        if(!userId){
            return res.json({
                success:false,
                message:"User not found"
            });
        }
        const user = await clerkClient.users.getUser(userId)
        const favorites = (user.privateMetadata.favorites as string[])||[];
        //Getting movies from database
        const movies = await Movie.find({
            _id:{
                $in:favorites
            }
        })

        res.json({success:true,movies})
    } catch (error:any) {
        console.error(error.message);
        res.json({success:false,message:error.message})
    }
}