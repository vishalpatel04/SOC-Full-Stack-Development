const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const port = 3000;


// TODO: Update PostgreSQL connection credentials before running the server
const pool = new Pool({
  user: 'vishalchandrapatel',
  host: 'localhost',
  database: 'ecommerce',
  password: '',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Set up session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard'); 
  }
  next();  
}

// TODO: Implement authentication middleware
// Redirect unauthenticated users to the login page
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next(); 
  res.redirect('/login');
}
}
  

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard');
});



// Route: Home page
app.get('/', async (req, res) => {
  try {
    // Query to get all products
    const result = await pool.query('SELECT * FROM Products');
    
    // Render the 'home-page' template, 
    // passing the retrieved product data to the template 
    // for rendering within the page.
    res.render('home-page', { products: result.rows });
  } catch (error) {
    console.error(error);
    res.send('Server error');
  }
});


// Route: Signup page
app.get('/signup', (req, res) => {
  req.session.destroy(); // force logout
  res.render('signup');
});

// TODO: Implement user signup logic
app.post('/signup', isLoggedIn, async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      [username, email, hashedPassword]
    );
    console.log('User inserted:', username);
    res.redirect('/login');
  } catch (error) {
    console.error('Signup failed:', error.message);
    
    if (error.code === '23505') {
      return res.send('Signup failed: Email already exists');
    }
  
    res.send('Signup failed: ' + error.message);
  }
});


app.get('/login', (req, res) => {
  res.render('login');
});

// Route: Login page 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login request:', username, password);

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    console.log('Query result:', result.rows); 

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.send('Invalid credentials (user not found)');
    }

    const user = result.rows[0];

    console.log('Password from form:', password);
    console.log('Password hash from DB:', user.password_hash);

    const match = await bcrypt.compare(password, user.password_hash);
    console.log('Password match result:', match); 

    if (!match) {
      console.log('Wrong password');
      return res.send('Invalid credentials (wrong password)');
    }

    req.session.userId = user.user_id;
    console.log('Login success. Redirecting to /dashboard...');
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Login failed:', error.message);
    res.send('Login failed: ' + error.message);
  }
});

// TODO: Implement user login logic
// Route: Dashboard page (requires authentication)
// TODO: Render the dashboard page
// Route: List products
// TODO: Fetch and display all products from the database
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY product_id');
    console.log('Products from DB:', result.rows);  
    res.render('products', { products: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.send('Error loading products.');
  }
});

// Route: Add product to cart
// TODO: Implement "Add to Cart" functionality
app.get('/add-to-cart', isAuthenticated, async (req, res) => {
  res.render('add-to-cart');
});

app.post('/add-to-cart', isAuthenticated, async (req, res) => {
  const { product_id, quantity } = req.body;
  const user_id = req.session.userId;

  try {
    await pool.query(
      'INSERT INTO cart (user_id, item_id, quantity) VALUES ($1, $2, $3)',
      [user_id, product_id, quantity]
    );
    res.send('Item added to cart successfully. <a href="/dashboard">Go back</a>');
  } catch (err) {
    console.error('Add to cart failed:', err.message);
    res.send('Failed to add to cart: ' + err.message);
  }
});



// Route: Remove product from cart
// TODO: Implement "Remove from Cart" functionality
app.get('/remove-from-cart', isAuthenticated, async (req, res) => {
  res.render('remove-from-cart');
});

// GET /remove-from-cart - Show the form
app.get('/remove-from-cart', isAuthenticated, (req, res) => {
  res.render('remove-from-cart');
});

// POST /remove-from-cart - Handle removal
app.post('/remove-from-cart', isAuthenticated, async (req, res) => {
  const { product_id } = req.body;
  const user_id = req.session.userId;

  try {
    // Check if item exists in the user's cart
    const check = await pool.query(
      'SELECT * FROM cart WHERE user_id = $1 AND item_id = $2',
      [user_id, product_id]
    );

    if (check.rows.length === 0) {
      return res.send("Item not found in your cart. <a href='/dashboard'>Back</a>");
    }

    // Delete the item
    await pool.query(
      'DELETE FROM cart WHERE user_id = $1 AND item_id = $2',
      [user_id, product_id]
    );

    res.send("Item successfully removed from cart. <a href='/dashboard'>Back to Dashboard</a>");
  } catch (err) {
    console.error('Remove from cart failed:', err.message);
    res.send("Error removing item from cart.");
  }
});


// Route: Display cart
// TODO: Retrieve and display the user's cart items
app.get('/display-cart', isAuthenticated, async (req, res) => {
  const user_id = req.session.userId;

  try {
    const result = await pool.query(`
      SELECT 
        p.product_id,
        p.name AS product_name,
        p.price,
        p.stock_quantity AS stock,
        c.quantity
      FROM cart c
      JOIN products p ON c.item_id = p.product_id
      WHERE c.user_id = $1
      ORDER BY p.product_id
    `, [user_id]);

    const cartItems = result.rows;

    // Calculate total cart price
    const totalCartPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.render('display-cart', { cartItems, totalCartPrice });
  } catch (err) {
    console.error('Error loading cart:', err.message);
    res.send('Failed to display cart');
  }
});

// Route: Place order (clear cart)
// TODO: Implement order placement logic
app.post('/place-order', isAuthenticated, async (req, res) => {
  const user_id = req.session.userId;

  try {
    // 1. Get cart items for the user
    const cartResult = await pool.query(`
      SELECT c.item_id AS product_id, c.quantity, p.price, p.stock_quantity, p.name
      FROM cart c
      JOIN products p ON c.item_id = p.product_id
      WHERE c.user_id = $1
    `, [user_id]);

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.send("Cart is empty. <a href='/dashboard'>Back to Dashboard</a>");
    }

    // 2. Check stock
    const outOfStockItems = cartItems.filter(item => item.quantity > item.stock_quantity);
    if (outOfStockItems.length > 0) {
      return res.send("One or more items are out of stock. Please update your cart. <a href='/dashboard'>Back</a>");
    }

    // 3. Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Insert into Orders table
    const orderResult = await pool.query(`
      INSERT INTO orders (user_id, order_date, total_amount)
      VALUES ($1, CURRENT_TIMESTAMP, $2)
      RETURNING order_id
    `, [user_id, totalAmount]);

    const order_id = orderResult.rows[0].order_id;

    // 5. Insert into OrderItems table
    for (const item of cartItems) {
      await pool.query(`
        INSERT INTO orderitems (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
      `, [order_id, item.product_id, item.quantity, item.price]);

      // 6. Update product stock
      await pool.query(`
        UPDATE products
        SET stock_quantity = stock_quantity - $1
        WHERE product_id = $2
      `, [item.quantity, item.product_id]);
    }

    // 7. Clear the cart
    await pool.query(`DELETE FROM cart WHERE user_id = $1`, [user_id]);

    // 8. Store order ID in session and redirect to confirmation
    req.session.lastOrderId = order_id;
    res.redirect('/order-confirmation');

  } catch (err) {
    console.error('Place order failed:', err.message);
    res.send("Error placing order.");
  }
});

// Route: Order confirmation
// TODO: Display order confirmation details
app.get('/order-confirmation', isAuthenticated, async (req, res) => {
  const user_id = req.session.userId;
  const order_id = req.session.lastOrderId;

  if (!order_id) {
    return res.send("No recent order found.");
  }

  try {
    const itemsResult = await pool.query(`
      SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.price
      FROM orderitems oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.product_id
    `, [order_id]);

    const orderResult = await pool.query(`
      SELECT order_id, order_date, total_amount
      FROM orders
      WHERE order_id = $1
    `, [order_id]);

    res.render('order-confirmation', {
      order: orderResult.rows[0],
      items: itemsResult.rows
    });

  } catch (err) {
    console.error('Load confirmation failed:', err.message);
    res.send("Unable to load confirmation.");
  }
});


// Route: Logout (destroy session)
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});