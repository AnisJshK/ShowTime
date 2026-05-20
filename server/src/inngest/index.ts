import { Inngest } from "inngest";
import Usermodel from "../models/user.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

type ClerkUserData = {
    id:string;
    first_name:string;
    last_name:string;
    email_addresses:{email_address:string}[];
    image_url:string;
}
type ClerkDeleteData ={
    id:string;
}

//Inngest function to save user data to a db
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    trigger: {
      event: "clerk/user.created",
    },

  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data as ClerkUserData;
      
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await Usermodel.create(userData)
  }
);

//Inngest Function to delete user from database

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    trigger: {
      event: "clerk/user.deleted",
    },

  },
  async ({ event }) => {
    const {id} = event.data as ClerkDeleteData;
    await Usermodel.findByIdAndDelete(id);
  }
);

//Inngest Function to update user from database

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    trigger: {
      event: "clerk/user.updated",
    },

  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data as ClerkUserData;
      
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await Usermodel.findByIdAndUpdate(id,userData)
  }
);



export const functions = [syncUserCreation,syncUserDeletion,syncUserUpdation];
