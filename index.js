import express from "express"
import pg from "pg";
import dotenv from "dotenv";
import bodyParser  from "body-parser";



//variables
let user_id;
let supplier_id;

//1.Get the environment variables from .env file
dotenv.config();

//2.Set up express app
const app = express();
const PORT =  process.env.PORT || 3000;


//middleware
app.use(bodyParser.urlencoded({extended: false}));

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
        const userData =await db.query("SELECT * from users");
        const supplierData = await db.query("SELECT supplier_id, supplier_name FROM suppliers");
        const allData = await db.query("SELECT i.item_id, i.item_name, s.supplier_name, s.contact_info FROM products i JOIN Suppliers s ON i.supplier_id = s.supplier_id;");

        const suppliers = supplierData.rows;
        const userDataRows = userData.rows;
        const allDataRows = allData.rows;

        user_id = userDataRows.map(user => user.user_id);
        supplier_id = suppliers.map(supplier => supplier.supplier_id);

        console.log(userDataRows)
        res.render("index.ejs",{
            users: user_id , // Correct property name
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
        const addProduct = await db.query("INSERT INTO products (item_name,item_quantity,user_id,supplier_id) VALUES ($1,$2,$3,$4);", [item_name, productQuantity,productUser,supplierId]);
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
        const addSupplier = await db.query("INSERT INTO suppliers (supplier_name,contact_info,user_id) VALUES ($1, $2, $3);",[productSupplier,supplierContact,productUser]);
        res.redirect("/")
      } catch (error) {
        console.error("Error adding items", error);
        res.status(500).send("Internal Server Error");
      }
})

//3. Start the server
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})