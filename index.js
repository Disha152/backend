import { ApolloServer } from "@apollo/server";
import mergedResolvers from "./resolvers/index.js";
import mergedTypeDefs from "./typeDefs/index.js";
import cors from "cors";
import path from 'path';
import express from "express";
import http from "http";
import dotenv from "dotenv";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { connectDB } from "./DB/connectDB.js";
import passport from "passport";
import session from "express-session";
import ConnectMongo from "connect-mongodb-session";
import { buildContext } from "graphql-passport";
import { configurePassport } from "./passport/passport.js";
dotenv.config();
configurePassport();

const __dirname =  path.resolve();

const app = express();

const httpServer = http.createServer(app);



const MongoDBStore = ConnectMongo(session);

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

store.on("error", (error) => {
  console.log(error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
    },
    store: store,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const server = new ApolloServer({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use(
  "/graphql",
  cors({
    origin: 'FRONTEND_URL',
    credentials: true,
  }),

  express.json(),

  expressMiddleware(server, {
    context: async ({ req, res }) => buildContext({ req, res }),
  })
);
app.use(express.static(path.join(__dirname, "Frontend/dist")));
app.get("*",(req,res)=>{
  res.sendFile(path.join(__dirname, "Frontend/dist","index.html"));
})
// Modified server startup
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
await connectDB();
console.log(`🚀 Server ready at http://localhost:4000/`);
