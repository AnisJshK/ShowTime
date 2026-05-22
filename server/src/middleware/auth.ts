import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";

export const protectAdmin = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {userId} = getAuth(req);
        if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }


        const user = await clerkClient.users.getUser(userId);
        if(user.privateMetadata.role !== 'admin'){
            return res.json({
                success:false,message:"not authorized"
            })
        }
        next();
    } catch (error) {
        return res.json({success:false,message:"not authorized"})
    }
}