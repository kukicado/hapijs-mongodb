const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi)
      
const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });
    
    await server.register({
        plugin: require('hapi-mongodb'),
        options: {
          url: '{YOUR-CONNECTION-STRING}',
          settings: {
              useUnifiedTopology: true
          },
          decorate: true
        }
    });
    
    server.route({
        method: 'GET',
        path: '/movies',
        handler: async (req, h) => {
            const offset = Number(req.query.offset) || 0;

            const movies = await req.mongo.db.collection('movies').find({}).skip(offset).limit(20).toArray()
      
            return movies;
        }
    });
    
    // Add a new movie to the database
    server.route({
        method: 'POST',
        path: '/movies',
        handler: async (req, h) => {

            const payload = req.payload
            
            const status = await req.mongo.db.collection('movies').insertOne(payload);
            return status;
        }
    });
    
    // Get a single movie
    server.route({
        method: 'GET',
        path: '/movies/{id}',
        handler: async (req, h) => {
            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;

            const movie = await req.mongo.db.collection('movies').findOne({_id: new ObjectID(id)},{projection:{title:1,plot:1,cast:1,year:1, released:1}});
            
            return movie;
        }
    });
    
    // Update the details of a movie
    server.route({
        method: 'PUT',
        path: '/movies/{id}',
        options: {
            validate: {
                params: Joi.object({
                    id: Joi.objectId()
                })
            }
        },
        handler: async (req, h) => {
            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;

            const payload = req.payload

            const status = await req.mongo.db.collection('movies').updateOne({_id: ObjectID(id)}, {$set: payload});

            return status;

        }
    });
    
    // Delete a movie from the database
    server.route({
        method: 'DELETE',
        path: '/movies/{id}',
        options: {
            validate: {
                params: Joi.object({
                    id: Joi.objectId()
                })
            }
        },
        handler: async (req, h) => {

            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;

            const payload = req.payload

            const status = await req.mongo.db.collection('movies').deleteOne({_id: ObjectID(id)});

            return status;
        }
    });
    
    // Search for a movie
    server.route({
        method: 'GET',
        path: '/search',
        handler: async(req, h) => {
            const query = req.query.term;

            const results = await req.mongo.db.collection("movies").aggregate([
                {
                    $searchBeta: {
                        "search": {
                            "query": query,
                            "path":"title"
                        }
                    }
                },
                {
                    $project : {title:1, plot: 1}
                },
                {  
                    $limit: 10
                }
                ]).toArray()
    
            return results;
        }
    });
    
    await server.start();
    console.log('Server running on %s', server.info.uri);
}

init();