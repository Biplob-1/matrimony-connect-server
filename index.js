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
    await client.connect();
    const userCollection = client.db('shaadi').collection('users');
    const biodataCollection = client.db('shaadi').collection('biodata');

    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h' })
      res.send({token});
    });

    //middelwares jwt
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next()
      })
    };

    // use verify admin after verifyToken
    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.plot === "admin";
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    //user related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user) {
        admin = user?.plot === 'admin';
      }
      res.send({admin});
    })
    
    app.post('/users', async (req, res) => {
      try {
        const users = req.body;
        const query = { email: users.email };
        console.log(users)

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
      const filter = {_id: new ObjectId(id)};
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
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // Biodata data insert route
    app.post('/biodatas', async (req, res) => {
      try {
        const biodatas = req.body;
        const result = await biodataCollection.insertOne(biodatas);
        res.send(result);
      } catch (error) {
        console.error('Biodata data insert error:', error);
        res.status(500).send('Error inserting biodata');
      }
    });

    app.get('/biodatas', async (req, res) => {
      try {
        const email = req.query.email;
        const query = {email: email}
        const result = await biodataCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Biodata data fetch error:', error);
        res.status(500).send('Error fetch biodata');
      }
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Start the server after successful DB connection
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
