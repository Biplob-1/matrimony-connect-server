const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@biplob.whidwsu.mongodb.net/?retryWrites=true&w=majority&appName=Biplob`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    // await client.connect();
    const userCollection = client.db('shaadi').collection('users');
    const biodataCollection = client.db('shaadi').collection('biodata');
    const favouriteCollection = client.db('shaadi').collection('favourite');

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    });

    // middlewares jwt
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
      })
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.plot === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    // user related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.plot === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {
      try {
        const users = req.body;
        const query = { email: users.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        const result = await userCollection.insertOne(users);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        console.error('User data insert error:', error);
      }
    });

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          plot: 'admin',
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // Biodata data insert route
    app.post('/biodatas', verifyToken, async (req, res) => {
      try {
        const biodata = req.body;

        // Fetch the latest biodataId from the biodataCollection
        const latestBiodata = await biodataCollection.find().sort({ biodataId: -1 }).limit(1).toArray();
        let biodataId = 1;

        if (latestBiodata.length > 0 && !isNaN(latestBiodata[0].biodataId)) {
          biodataId = parseInt(latestBiodata[0].biodataId, 10) + 1;
        }
        console.log('Latest Biodata:', latestBiodata);
        console.log('New Biodata ID:', biodataId);

        // Add biodataId and createdAt to the biodata object
        const biodataToAdd = {
          ...biodata,
          biodataId: biodataId,
          createdAt: new Date(),
        };

        const result = await biodataCollection.insertOne(biodataToAdd);
        res.send(result);
      } catch (error) {
        console.error('Biodata data insert error:', error);
        res.status(500).send('Error inserting biodata');
      }
    });


    app.get('/biodatas', verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email }
        const result = await biodataCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Biodata data fetch error:', error);
        res.status(500).send('Error fetch biodata');
      }
    });

    app.get('/allBiodatas', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email }
        const result = await biodataCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Biodata data fetch error:', error);
        res.status(500).send('Error fetch biodata');
      }
    });

    // single biodata fetch api using id
    app.get('/allBiodatas/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id)};
        const result = await biodataCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Biodata data Details error:', error);
        res.status(500).send('Error fetch biodata details');
      }
    });
    // Biodata data update route
    app.put('/biodatas/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBiodata = req.body;

        // Ensure the id is valid
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' });
        }
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: updatedBiodata,
        };

        const result = await biodataCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Biodata data update error:', error);
        res.status(500).send('Error updating biodata');
      }
    });


    // Add to Favourite API
    app.post('/favourites', verifyToken, async (req, res) => {
      try {
        const favouriteData = req.body;
        const { userEmail, biodataUserBiodataId } = favouriteData;

        // Check if the entry already exists
        const existingFavourite = await favouriteCollection.findOne({
          userEmail: userEmail,
          biodataUserBiodataId: biodataUserBiodataId,
        });

        if (existingFavourite) {
          return res.status(400).send({ message: 'Biodata already in favourites' });
        }

        // Add createdAt timestamp (optional)
        favouriteData.createdAt = new Date();

        const result = await favouriteCollection.insertOne(favouriteData);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error adding to favourites:', error);
        res.status(500).send('Error adding to favourites');
      }
    });

    // Backend API to fetch user's favourite biodatas
    app.get('/favourites', verifyToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;
        const query = { userEmail: userEmail };
        const result = await favouriteCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching favourite biodatas:', error);
        res.status(500).send('Error fetching favourite biodatas');
      }
    });

    app.delete('/favourites/:id', verifyToken, async (req, res) => {
      try {
        const favouriteId = req.params.id;
        const query = { _id: new ObjectId(favouriteId) };
        const result = await favouriteCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error deleting favourite:', error);
        res.status(500).send('Error deleting favourite');
      }
    });
    



    

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Start the server after successful DB connectionver
    app.listen(port, () => {
      console.log(`Shaadi server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Shaadi server running');
});
