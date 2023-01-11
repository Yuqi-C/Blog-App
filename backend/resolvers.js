const ObjectId = require('mongodb').ObjectID
const { subscribe, GraphQLError } = require('graphql');
const { PubSub, withFilter } = require('graphql-subscriptions');
const axios = require("axios");

var global_bid = 0;
var global_uid = 0;
const pubsub = new PubSub()

const resolvers = {
    Query: {
      user: async (_, { username }, context) => {
        let user = await context.db._mongoDb.collection('users').find({username: username}).sort().toArray();
        if(user.length != 0){
          return context.loaders.user.load(user[0]._id.toString());
        }else{
          throw new GraphQLError("username is not exist!!");
        }
      },
      login: async (_, { username, password }, context) => {
        let user = await context.db._mongoDb.collection('users').find({username: username}).sort().toArray();
        if(user.length != 0){
          if(user[0].password === password){
            return "success";
          }else{
            return "password";
          }
        }else{
          return "username";
        }
      },
      blog: (_, {bid}, context) => {
          return context.loaders.blogs.load(bid);
      },
      blogs: async (_, { is_private=false, sort='descend', username=null}, context) => {
          let blogs = new Array();
          let sorted_type = -1;
          if(sort === 'ascend'){
              sorted_type = 1;
          }
          if(is_private){
              blogs = await context.db._mongoDb.collection('blogs').find({username: username}).sort({created_at: sorted_type}).toArray();
          }else{
              blogs = await context.db._mongoDb.collection('blogs').find({is_private: false}).sort({created_at: sorted_type}).toArray();
          }
          let n = blogs.length;
          let i = 0;
          let write_data = new Array();
          while(i < n){
              write_data.push(context.loaders.blogs.load((blogs[i]._id.toString())));
              i++;
          }
          return write_data;
      },
      translate: async (_, {text}, context) =>{
        let options = {
          method: 'GET',
          url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
          params: {text: text, to: 'es', from: 'en'},
          headers: {
            'X-RapidAPI-Key': 'eadb410edcmshca6c29a90a093dap153f4fjsn59e59b67d8f1',
            'X-RapidAPI-Host': 'nlp-translation.p.rapidapi.com'
          }
        };
        let return_value = "";
        await axios.request(options).then(function (response) {
          return_value = response.data.translated_text.es;
        }).catch(function (error) {
          console.error(error);
        });
        return return_value;
      },
    },
    Mutation:{
      userCreate: async (_, userInput, context) => {
        let username = userInput.username;
        let password = userInput.password;
        let bio = userInput.bio;
        let nickname = userInput.nickname;
        let newObjectId = ObjectId(global_uid);
        global_uid ++;
        let single_user = {
            _id: newObjectId,
            username: username,
            password: password,
            bio: bio,
            nickname: nickname
        };
        let check = await context.db._mongoDb.collection('users').find({username: username}).sort().toArray();
        if(check.length === 0){
          await context.db._mongoDb.collection("users").insertOne(single_user);
          return "success";
        }else{
          return "username";
        }
      },
      blogCreate: async (_, {blogInput}, context) => {
          let text = blogInput.text;
          let username = blogInput.username;
          let is_private = blogInput.is_private;
          let newObjectId = ObjectId(global_bid);
          let ip = blogInput.ip;
          global_bid ++;
          let time = new Date().toISOString();
          let single_blog = {
              _id: newObjectId,
              username: username,
              created_at: time,
              is_private: is_private,
              text: text,
              ip:ip
          };
          await context.db._mongoDb.collection("blogs").insertOne(single_blog);
          pubsub.publish('Blog_Create', {
            blogCreate: {
                bid: newObjectId.toString(),
                username: username.toString(),
                text: text
            }
          });
          return context.loaders.blogs.load(newObjectId.toString());
      },
      blogEdit: async (_, {username, text}, context) => {
        pubsub.publish('Blog_Edit', {
            blogEdit: {
                username: username.toString(),
                text: text.toString()
            }
        })
        return text;
      },
      blogUpdate: async (_, {bid, text}, context) => {
        let id = new ObjectId(bid);
        let new_text = text;
        let blog = await context.db._mongoDb.collection('blogs').find({_id: id}).toArray();
        let time = new Date().toISOString();
        blog[0].text = new_text;
        blog[0].created_at = time
        await context.db._mongoDb.collection('blogs').updateOne({_id: id}, {$set:blog[0]});
        context.loaders.blogs.clear(id.toString());
        return context.loaders.blogs.load(id.toString());
      },
      blogDelete: async (_, {bid}, context) => {
          let id = new ObjectId(bid);
          let data = await context.db._mongoDb.collection('blogs').find({_id: id}).toArray();
          let ans = await context.db._mongoDb.collection('blogs').deleteOne({_id: id});
          if (ans.deletedCount != 0){
              context.loaders.blogs.clear(id.toString());
              return true;
          }
          else{
              return false;
          }
      },
      delete: async(_, {bid}, context) =>{
        await context.db._mongoDb.collection('blogs').deleteMany({});
        return true;
      }
    },
    Subscription: {
      blogCreate: {
        subscribe: () => pubsub.asyncIterator(['Blog_Create']),  
      },
      blogEdit: {
        subscribe: withFilter(() => pubsub.asyncIterator(['Blog_Edit']),
        (EditPayLoad, {username}) => {
          return EditPayLoad.blogEdit.username === username;
        }
        ),  
      },
      blogDelete: {
        subscribe: () => pubsub.asyncIterator(['Blog_Delete']),
      }
    },
    Blog: {
      bid: async ({bid}, _, context) => {
          return await context.loaders.blogs.load(bid)
          .then(({bid}) => bid);
      },
      username: async ({bid}, _, context) => {
          return await context.loaders.blogs.load(bid)
          .then(({username}) => username);
      },
      is_private: async ({bid}, _, context) => {
          return await context.loaders.blogs.load(bid)
          .then(({is_private}) => is_private);
      },
      text: async ({bid}, _, context) => {
          return await context.loaders.blogs.load(bid)
          .then(({text}) => text);
      },
      created_at: async ({bid}, _, context) => {
          return await context.loaders.blogs.load(bid)
          .then(({created_at}) => created_at);
      },
      ip: async ({bid}, _, context) => {
        return await context.loaders.blogs.load(bid)
        .then(({ip}) => ip);
      },
    },
    User: {
      uid: async ({uid}, _, context) => {
          return await context.loaders.user.load(uid)
          .then(({uid}) => uid);
      },
      username: async ({uid}, _, context) => {
          return await context.loaders.user.load(uid)
          .then(({username}) => username);
      },
      password: async ({uid}, _, context) => {
          return await context.loaders.user.load(uid)
          .then(({password}) => password);
      },
      nickname: async ({uid}, _, context) => {
          return await context.loaders.user.load(uid)
          .then(({nickname}) => nickname);
      },
      bio: async ({uid}, _, context) => {
          return await context.loaders.user.load(uid)
          .then(({bio}) => bio);
      },
    }
};

module.exports = resolvers;

