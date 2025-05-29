import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {getVideoDuration} from "../utils/ffmpeg.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if(!req.user){
        throw new ApiError(401,"User needs to be logged in")
    }
    //constructing the match object to filter videos
    const match={
        ...(query ? {title:{$regex:query,$options:"i"}}:{}),
        ...(userId ? {owner:mongoose.Types.ObjectId(userId)}:{}),
    };
    const videos=await Video.aggregate([
        {
            $match:match
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videosByOwner",
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                likes: 1,
                comments: 1,
                isPublished: 1,
                owner:{
                    $arrayElemAt:["$videosByOwner",0]
                }
            },
        },
        {
            $sort:{
                [sortBy]:sortType==="desc"?-1:1
            }
        },
        {
            $skip:(page-1)*parseInt(limit)
        }
    ])
    if(!videos?.length){
        throw new ApiError(404,"Videos not found")
    }
    return res.status(200).json(
        new ApiResponse(200,videos,"Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title){
        throw new ApiError(400,"Title is required")
    }
    if(!description){
        throw new ApiError(400,"Description is required")
    }
    const videoLocalPath=req.files?.videoFile[0]?.path
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path
    if(!videoLocalPath){
        throw new ApiError(400,"Video file is required")
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail file is required")
    }
    
    try{
        console.log("Video path:", videoLocalPath);
        const duration=await getVideoDuration(videoLocalPath)
        const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail){
            throw new ApiError(500,"Something went wrong while uploading thumbnail")
        }
        const videoFile=await uploadOnCloudinary(videoLocalPath)
        if(!videoFile){
            throw new ApiError(500,"Something went wrong while uploading video file")
        }

        const videoDoc=await Video.create({
            title,
            description,
            thumbnail:thumbnail.url,
            videoFile:videoFile.url,
            duration,
            owner:req.user?._id
        })
        if(!videoDoc){
            throw new ApiError(500,"Something went wrong while creating video")
        }
        return res
        .status(201)
        .json(
            new ApiResponse(201,videoDoc,"Video published successfully")
        )   
    }
    catch(err){
        console.log("Error while publishing video", err);
        throw new ApiError(500,"Something went wrong while publishing video")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }

    const video=await Video.findById(videoId).populate("owner","name email")
    if(!video){
        throw new ApiError(404,"Video not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,video,"Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    
    let updateData={title,description}
    if(req.files){
        const thumbnailLocalPath=req.file.path
        if(!thumbnailLocalPath){
            throw new ApiError(400,"Thumbnail file is missing")
        }
        const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail){
            throw new ApiError(500,"Something went wrong while uploading thumbnail")
        }
        updateData.thumbnail=thumbnail.url
        
    }

    const updatedVideo=await Video.findByIdAndUpdate(videoId,
        {$set:updateData},
        {new:true,runValidators:true})
    if(!updatedVideo){
        throw new ApiError(404,"Video not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,updatedVideo,"Video updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    const deletedVideo=await Video.findByIdAndDelete(videoId)
    if(!deletedVideo){
        throw new ApiError(404,"Video not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,deletedVideo,"Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle publish status
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    const video=await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found")
    }
    video.isPublished=!video.isPublished
    const updatedVideo=await video.save()
    return res
    .status(200)
    .json(
        new ApiResponse(200,updatedVideo,"Video status updated successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}