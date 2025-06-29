import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials not provided. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const callbackURL = "http://localhost:5000/api/auth/google/callback";

  // server/auth.ts
// ...
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // STEP 1: Log the raw profile data from Google
        console.log("--- GoogleStrategy Callback Initiated ---");
          console.log("Google Profile ID:", profile.id);
          console.log("Google Profile Emails:", profile.emails);
          console.log("Google Profile Name:", profile.name);


        const email = profile.emails?.[0]?.value || "";
        const firstName = profile.name?.givenName || "";
        const profileImageUrl = profile.photos?.[0]?.value || "";

         if (!email) {
            console.error("No email found in Google profile.");
            return done(new Error("No email found in Google profile"), undefined);
          }

          console.log("Attempting to upsert user with data:", {
            id: profile.id, // This is what goes into users.id
            email: email,
            first_name: firstName,
            profile_image_url: profileImageUrl,
          });


        const user = await storage.upsertUser({
          id: profile.id,
          email: email,
          first_name: firstName,
          profile_image_url: profileImageUrl,
        });

        console.log("User upserted successfully:", user);
        return done(null, user);
      } catch (error) {
        // STEP 3: Better error logging
        console.error("❌ Error during Google OAuth upsert:", error);
        return done(error, undefined);
      }
    }
  )
);
// ...

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Auth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Session destruction failed" });
        }
        res.clearCookie("connect.sid");
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
