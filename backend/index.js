const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { createServer } = require('http');
const express = require('express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const typeDefs = require("./typeDefs");
const resolvers = require("./resolvers");
const DataLoader = require('dataloader');
const ObjectId = require('mongodb').ObjectID
const { MongoClient } = require ('mongodb');
const fs = require('fs');
const { readFileSync } = require('fs')
const { PubSub } = require('graphql-subscriptions');


// Create the schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });
const pubsub = new PubSub()

// Create an Express app and HTTP server; we will attach both the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
const httpServer = createServer(app);

// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer({ schema }, wsServer);

class Database{
    constructor(file_path){
        this.path = file_path;
        const database_config = {
            host: "localhost",
            port: "27017",
            db: "ee547_hw",
            opts:{
                useUnifiedTopology: true
            }
        };
        if (!fs.existsSync('./config')){
            fs.mkdirSync('./config');
        }
        if(!fs.existsSync(file_path)){
            fs.writeFileSync(file_path, JSON.stringify(database_config));
        }
    }
    async _connect(){
        try{
            let data = fs.readFileSync(this.path);
            let parse_data = JSON.parse(data);
            this.port = parse_data['port'];
            if (!this.port){
                this.port = '27017';
            }
            this.host = parse_data['host'];
            if (!this.host){
                this.host = 'localhost';
            }
            this.opts = parse_data['opts'];
            if (!this.opts){
                this.opts = {useUnifiedTopology: true};
            }
            this.db = parse_data['db'];
            if (!this.db){
                this.db = 'ee547_hw';
            }
            this.url = "mongodb://" + this.host + ":" + this.port;
            }catch(e){
                console.error(e);
                process.exit(2);
            }
            this.client = new MongoClient(this.url, this.opts);
            try {
                this.client.connect();
                this._mongoDb = this.client.db(this.db);
              } catch(err) {
                console.error(`mongodb connection error -- ${err}`);
                process.exit(5);
              }
    }
    async _close() {
        if (this._mongoConnect) {
          return this._mongoConnect.close();
          this._mongoConnect = null;
        }
    }
}

const db = new Database('./config/mongo.json');

(async () => {
    await db._connect();
    // app.listen(db.port);
})();

// Set up ApolloServer.
const server = new ApolloServer({
  includeStacktraceInErrorResponses: true,
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),
    
    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

(async function () {
await server.start();
app.use('/graphql', cors(), bodyParser.json(), expressMiddleware(server, 
  {context: async (req) => {
      return {
      db : db,
      pubsub,
      loaders: {
          blogs: new DataLoader(keys => getBlogs(db, keys)),
          user: new DataLoader(keys => getUsers(db, keys))
      }
      }
    },
  }
));

const PORT = 3000;
// Now that our HTTP server is fully set up, we can listen to it.
httpServer.listen(PORT, () => {
  console.log(`Server is now running on http://localhost:${PORT}/graphql`);
});
})()

function blogStructure(blog){

    let blog_Structure = {
        bid: blog._id.toString(),
        username: blog.username.toString(),
        created_at: blog.created_at.toString().slice(0, 19) + 'Z',
        is_private: blog.is_private,
        text: blog.text,
        ip: blog.ip
    }
    return blog_Structure
}

async function Valid_blog(blogs){
    let output = new Array();
    for (i in blogs){
        let blog = blogs[i];
        let ans = await blogStructure(blog);
        output.push(ans);
    }
    return output;
}

async function getBlogs(db, keys){
    let acc = new Array()
    for(i in keys){
        let bid = keys[i]
        let id = new ObjectId(bid);
        let blog = await db._mongoDb.collection('blogs').find({_id: id}).toArray();
        let write_data = await Valid_blog(blog);
        acc[bid] = write_data[0];
    }
    return keys.map(key => acc[key] || new Error('bid [' + key + '] does not exist'));
};

function userStructure(user){

  let user_Structure = {
      uid: user._id.toString(),
      username: user.username,
      password: user.password,
      nickname: user.nickname,
      bio: user.bio
  }
  return user_Structure
}

async function getUsers(db, keys) {
  let acc = new Array()
  for (i in keys) {
      let uid = keys[i]
      let id = new ObjectId(uid)
      let user = await db._mongoDb.collection('users').find({_id: id}).toArray();
      let write_data = userStructure(user[0]);
      acc[uid] = write_data;
  }
  return keys.map(key => acc[key] || new Error('bid [' + key + '] does not exist'));
}