const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
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
    const biodataCollection = client.db('shaadi').collection('biodata');

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
