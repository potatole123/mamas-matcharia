import admin from "./firebaseAdmin";
import type { Request, Response, NextFunction } from "express";


export default async function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({message: 'Unauthorized: No token provided'});
    }

    const idToken = authHeader.split('Bearer ')[1] as string;

    try{
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user=decodedToken;
        next();
    } catch (error){
        console.error('Error verifying token:', error);
        return res.status(401).json({message: 'Unauthorized: Invalid token'});
    }
}