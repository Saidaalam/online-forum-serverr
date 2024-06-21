const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.jasskbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    //await client.connect();
    const db = client.db('announcementDB');
    const announcementCollection = db.collection('announcement');
    const tagCollection = db.collection('tag');
    const postCollection = db.collection('post');
    const userCollection = db.collection('user');
    const profileCollection = db.collection('profile');

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      console.log('Inside verify token', req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden Access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Create a new announcement
    app.post('/announcements', async (req, res) => {
      const newAnnouncement = req.body;
      const result = await announcementCollection.insertOne(newAnnouncement);
      res.send(result);
    });

    // Get all announcements
    app.get('/announcements', async (req, res) => {
      const cursor = announcementCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/singleUser', async (req, res) => {
      const newProfile = req.body;
      const result = await profileCollection.insertOne(newProfile);
      res.send(result);
    });

    app.get('/singleUser', async (req, res) => {
      const cursor = profileCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

   // Create a new user
app.post('/user', async (req, res) => {
  try {
    const newUser = req.body;
    const result = await userCollection.insertOne(newUser);
    res.status(201).json({ message: 'User added successfully', newUser });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

// Get all users
app.get('/user', async (req, res) => {
  try {
    const users = await userCollection.find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


    app.get('/user/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // Update user to admin
    app.patch('/users/admin/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: 'admin' } };
      try {
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Error updating user to admin:', error);
        res.status(500).json({ error: 'Failed to update user to admin' });
      }
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden access' });
      }
      next();
    };

    app.get('/admin/dashboard', verifyAdmin, (req, res) => {
      res.json({ message: 'Welcome to the Admin Dashboard' });
    });

    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
    
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
    
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })    

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    // Create a new tag
    app.post('/tags', async (req, res) => {
      const newTag = req.body;
      try {
        const result = await tagCollection.insertOne(newTag);
        res.status(201).json(result.ops[0]);
      } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ error: 'Failed to create tag' });
      }
    });

    // Count posts
    app.get('/posts/count', async (req, res) => {
      try {
        const count = await postCollection.countDocuments();
        res.json({ count });
      } catch (error) {
        console.error('Error fetching post count:', error);
        res.status(500).json({ error: 'Failed to fetch post count' });
      }
    });

    // Count announcements
    app.get('/announcements/count', async (req, res) => {
      try {
        const count = await announcementCollection.countDocuments();
        res.json({ count });
      } catch (error) {
        console.error('Error fetching announcement count:', error);
        res.status(500).json({ error: 'Failed to fetch announcement count' });
      }
    });

    // Get all tags
    app.get('/tags', async (req, res) => {
      try {
        const cursor = tagCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
      }
    });

    // Get all posts
    app.get('/posts', async (req, res) => {
      try {
        const cursor = postCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
      }
    });

   // Search posts by tags
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }
    const posts = await postCollection.find({ tags: { $regex: query, $options: 'i' } }).toArray();
    res.json(posts);
  } catch (err) {
    console.error('Error searching posts:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

     // Search posts by tags
     app.get('/api/search', async (req, res) => {
      try {
        const query = req.query.q;
        const posts = await postCollection.find({ tags: { $regex: query, $options: 'i' } }).toArray();
        res.json(posts);
      } catch (err) {
        console.error('Error searching posts:', err);
        res.status(500).send('Server Error');
      }
    });

    // Get a single post by ID
    app.get('/posts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const post = await postCollection.findOne(query);
      res.send(post);
    });

    // Create a new post
    app.post('/posts', async (req, res) => {
      const newPost = req.body;
      newPost.upVotes = 0;
      newPost.downVotes = 0;
      newPost.time = new Date(); 
      try {
        const result = await postCollection.insertOne(newPost);
        res.status(201).json(result.ops[0]); 
      } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
      }
    });

    // Upvote a post
    app.put('/posts/:id/upvote', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $inc: { upVotes: 1 } };
      try {
        const result = await postCollection.updateOne(filter, update);
        res.json(result);
      } catch (error) {
        console.error('Error upvoting post:', error);
        res.status(500).json({ error: 'Failed to upvote post' });
      }
    });

    // Downvote a post
    app.put('/posts/:id/downvote', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $inc: { downVotes: 1 } };
      try {
        const result = await postCollection.updateOne(filter, update);
        res.json(result);
      } catch (error) {
        console.error('Error downvoting post:', error);
        res.status(500).json({ error: 'Failed to downvote post' });
      }
    });
    

    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Online forum server is running');
});

app.listen(port, () => {
  console.log(`Online forum is running on port: ${port}`);
});