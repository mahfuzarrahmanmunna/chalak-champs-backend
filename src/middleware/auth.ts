import type { Request, Response, NextFunction } from 'express';
// import { auth } from '../config/firebase';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Check if user exists in our database
      let user = await User.findOne({ uid });

      // If user doesn't exist, create a new user record
      if (!user) {
        user = new User({
          uid,
          email: decodedToken.email || '',
          displayName: decodedToken.name || '',
          photoURL: decodedToken.picture || '',
          emailVerified: decodedToken.email_verified || false,
        });
        await user.save();
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Firebase auth error:', error);
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};