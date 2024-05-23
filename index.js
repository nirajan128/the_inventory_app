import express from "express"
import pg from "pg";
import dotenv from "dotenv";
import bodyParser  from "body-parser";



//variables
let userName;
let user_id;
let supplier_id;

//1.Get the environment variables from .env file
dotenv.config();

//2.Set up express app
const app = express();
const PORT =  process.env.PORT || 3000;


//middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//4.Connect with the database
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false, //disables certificate validation
      },
}) 

await db.connect();

//sample
app.get("/", async(req,res) => {
    try {
        const userData =await db.query("SELECT * from users"); //user data
        const supplierData = await db.query("SELECT supplier_id, supplier_name FROM suppliers"); //supplierData
        const query = `
        SELECT 
        products.item_id,
        products.item_name,
        Suppliers.supplier_name,
        Min_Stock.min_stock_level,
        Available_Stock.available_stock,
        to_order.to_order
      FROM 
        products
      INNER JOIN 
        Suppliers ON products.supplier_id = Suppliers.supplier_id
      INNER JOIN 
        Min_Stock ON products.item_id = Min_Stock.item_id
      INNER JOIN 
        Available_Stock ON products.item_id = Available_Stock.item_id
      INNER JOIN
        to_order ON products.item_id = to_order.item_id;`;  //quer to display all data

        const allData = await db.query(query);

        //rows of data
        const suppliers = supplierData.rows;
        const userDataRows = userData.rows;
        const allDataRows = allData.rows;
        
        userName = userDataRows.map(user => user.user_name);
        user_id = userDataRows.map(user => user.user_id);
        supplier_id = suppliers.map(supplier => supplier.supplier_id);

        res.render("index.ejs",{
            users: userName, // Correct property name
            suppliers: suppliers,
            allData : allDataRows
        })
    } catch (error) {
        console.error("Error fetching data from the Users table", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/addItem", async(req,res) => {
    try {
        const item_name = req.body["itemName"];
        const productUser = user_id[0];
        let productQuantity = parseInt(req.body["quantity"]);
        const supplierId = req.body["supplier"];
        const min_stock_level = parseInt(req.body["min_stock"]);

          // Start a transaction
            await db.query("BEGIN");


         // Insert new product
        const addProduct = await db.query(
        "INSERT INTO products (item_name, supplier_id, user_id) VALUES ($1, $2, $3) RETURNING item_id",
        [item_name, supplierId, productUser]
      );

        //get id of the item and set initial available stock value to item_quantity
        const item_id = addProduct.rows[0].item_id;
        await db.query(
            "INSERT INTO available_Stock (item_id, available_stock) VALUES ($1, $2)",
            [item_id, productQuantity]
          );

          //set minimum stock level
          await db.query(
            "INSERT INTO Min_Stock (item_id, min_stock_level) VALUES ($1, $2)",
            [item_id, min_stock_level]
          );

          const to_order = min_stock_level - productQuantity;
          await db.query("INSERT INTO to_order (item_id, to_order) VALUES ($1,$2)",
            [item_id, to_order]
          );

           // Commit the transaction
         await db.query("COMMIT");
        res.redirect("/");

    } catch (error) {
        console.error("Error adding items", error);
        res.status(500).send("Internal Server Error");
    }
})

//add supplier
app.post("/addSupplier", async(req,res) =>{
      try {
        const supplierContact = req.body["contact"];
        const productSupplier = req.body["supplier"];
        const productUser = user_id[0];
        //Insert new supplier
        const addSupplier = await db.query("INSERT INTO suppliers (supplier_name,contact_info,user_id) VALUES ($1, $2, $3);",[productSupplier,supplierContact,productUser]);
        res.redirect("/")
      } catch (error) {
        console.error("Error adding items", error);
        res.status(500).send("Internal Server Error");
      }
})

//update item
app.post("/updateStock", async (req, res) => {
  try {
    // Log the request body to check the incoming data
    console.log(req.body);

    // Extract item_id and available_stock from the request body
    const item_id = parseInt(req.body.item_id);
    const available_stock = parseInt(req.body.available_stock);
    const min_stock_level = parseInt(req.body.min_stock_level);

      // Log the parsed values to verify them
      console.log("Parsed item_id:", item_id);
      console.log("Parsed available_stock:", available_stock);
      console.log("Parsed min stock level:", min_stock_level);

    // Ensure the parsed values are correct
    if (isNaN(item_id) || isNaN(available_stock)){
      throw new Error("Invalid item_id or available_stock");
    }

    // Update the available stock in the database
    await db.query("UPDATE available_stock SET available_stock = $1 WHERE item_id = $2", [available_stock, item_id]);

    // Update the minimum stock level in the database
    await db.query("UPDATE min_stock SET min_stock_level = $1 WHERE item_id = $2", [min_stock_level, item_id]);

     // Recalculate to_order value
     const new_to_order = min_stock_level - available_stock;

     // Update the to_order value in the database
     await db.query("UPDATE to_order SET to_order = $1 WHERE item_id = $2", [new_to_order, item_id]);

    res.redirect("/");
  } catch (error) {
    console.error("Error updating stock", error);
    res.status(500).send("Internal Server Error");
  }
});


//3. Start the server
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})