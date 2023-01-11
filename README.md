# ee547_Blog_App
# Frontend
## Environment
Angular CLI: 14.2.10  
Node: 16.10.0  
Dependencies: see package.json  
     
## Deploy 
1. Enter ng build command in the root path to generate a dist folder.  
2. Create app.yaml file   
3. Create a project and a bucket on GCP.   
4. Upload them to the bucket and deploy.  

## file inrtoduction
./frontend/src/app/components includes all of the angular components needed to build the application.   

# Backend
## Environment
Express: 4.17.1  
Mongodb: 4.1.2  
Dependencies: see package.json   

## Set up 
1. Enter 'npm install package.json' to install the dependencies.  
2. Run 'node index.js' to start the server     

## file inrtoduction
./ee547_backend/index.js is used to set up express, dataloader, apollo server, websocket, MongoDB, graphql.  
./ee547_backend/resolvers.js is used by graphql, all the resolvers is in there.  
./ee547_backend/typeDefs.js is the schema that graphql used.  
./ee547_backend/package.json and ./ee547_backend/package-lock.json are the denpendencies.  
