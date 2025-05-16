import { v2 as cloudinary } from "cloudinary";

import fs from "fs";

 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath) return null;
    const response= await cloudinary.uploader.upload(localFilePath,{
      resource_type:"auto"
    })
    // console.log("File uploaded on cloudinary",response.url);
    if(fs.existsSync(localFilePath)){fs.unlinkSync(localFilePath);} //remove the file from local storage
    return response
  } catch (error) {
    if(fs.existsSync(localFilePath)){fs.unlinkSync(localFilePath);} //remove the file from local storage as the upload failed
    return null;
  }
}

// const deleteFromCloudinary = async (publicId) => {
//   try {
//     if (!publicId) throw new Error("publicId is required to delete an image");

//     const result = await cloudinary.uploader.destroy(publicId);
//     return result; // { result: 'ok' } or { result: 'not found' }
//   } catch (error) {
//     console.error("Error deleting from Cloudinary:", error);
//     return null;
//   }
// };


export { uploadOnCloudinary };
// export {deleteFromCloudinary};